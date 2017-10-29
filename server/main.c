#include <stdio.h>
#include <signal.h>
#include <stdlib.h>
#include <unistd.h>
#include <limits.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <string.h>
#include <dirent.h>
#include <sys/types.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <microhttpd.h>
#include <sys/stat.h>
#include <regex.h>
#include <libgen.h>

int http_port = 55301;
int wait_interval = 250;
char *http_address = "127.0.0.1";
char *app_root = "/usr/share/ssetop/webapp";

struct dirent *ent;
DIR *proc_dir;
FILE *pid_stat_file;
FILE *stat_file;
char fn[32];

FILE *file_meminfo;
char data_line[128] = "data: ";
char *data_line_start;
int data_line_len;

struct MHD_Daemon *http_daemon;

char line_buffer[512];
int count;
char *field;

char *line;
size_t len;
ssize_t line_len;

/******************************************************************************/
void mom ()
{
	puts("Cleaning...");

	// TODO: wont stop... do we even need this?
	//MHD_stop_daemon(http_daemon);

	closedir(proc_dir);
	fclose(stat_file);
	fclose(file_meminfo);

	exit(0);
}

/******************************************************************************/
void init_stream_socket (int socket)
{
	char config_data[32];
	int len;

	long clock_tick = sysconf(_SC_CLK_TCK);
	long page_size = sysconf(_SC_PAGESIZE);
	long max_pages = sysconf(_SC_PHYS_PAGES);
	long num_cpus = sysconf(_SC_NPROCESSORS_ONLN);

	len = sprintf(
		config_data,
		"data: %li %i %li %li %li\n\n",
		clock_tick,
		wait_interval,
		page_size,
		max_pages,
		num_cpus
	);

	fcntl(socket, F_SETFL, O_NONBLOCK);
	send(socket, "HTTP/1.1 200 OK\n", 16, 0);
	send(socket, "Access-Control-Allow-Origin: *\n", 31, 0);
	send(socket, "Content-Type: text/event-stream;charset=utf-8\n\n", 47, 0);

	send(socket, "event: config\n", 14, 0);
	send(socket, config_data, len, 0);
}

/******************************************************************************/
int parse_pid_stat_file (char *filename, char out[])
{
	sprintf(fn, "/proc/%s/stat", filename);
	pid_stat_file = fopen(fn, "rb");
	if (pid_stat_file != NULL)
	{
		fgets(line_buffer, 512, pid_stat_file);
		fclose(pid_stat_file);

		count = 0;
		out[6] = '\0';
		for (field = strtok(line_buffer, " "); field; field = strtok(NULL, " "))
		{
			switch (++count)
			{
				case 1:  // pid
				case 2:  // comm // TODO: may contain spaces...
				case 14: // utime
				case 15: // stime
				case 24: // rss
				case 39: // processor
					strcat(out, field);
					if (count >= 39) {
						strcat(out, "\n");
						return strlen(out);
					}
					strcat(out, " ");
					break;
			}
		}
	}
	return -1;
}

/******************************************************************************/
int send_stat_file (int socket)
{
	rewind(stat_file);
	line = NULL;
	len = 0;
	count = -1;

	while ((line_len = getline(&line, &len, stat_file)) != -1)
	{
		if (strncmp("cpu", line, 3) == 0)
		{
			if (count >= 0) {
				data_line[6] = '\0';
				data_line_start = line;
				data_line_start += 3;
				strcat(data_line, data_line_start);
				send(socket, data_line, strlen(data_line), MSG_NOSIGNAL);
			}
			count++;
		} else {
			send(socket, "\n", 1, MSG_NOSIGNAL);
			return 1;
		}
	}
	return -1;
}

/******************************************************************************/
int get_val (char *input, char *field_name, char output_string[], int is_last)
{
	char *value;
	if (strncmp(input, field_name, strlen(field_name)) == 0)
	{
		value = strtok(input, " ");
		value = strtok(NULL, " ");
		strcat(output_string, value);
		if (is_last) {
			strcat(output_string, "\n");
		} else {
			strcat(output_string, " ");
		}
		return 1;
	}
	return 0;
}

/******************************************************************************/
void send_meminfo_file (int socket)
{
	rewind(file_meminfo);

	data_line[6] = 0;

	while (fgets(line_buffer, 512, file_meminfo))
	{
		switch (line_buffer[0])
		{
			case 'M':
				if (get_val(line_buffer, "MemTotal:", data_line, 0)) {}
				else if (get_val(line_buffer, "MemFree:", data_line, 0)) {}
				break;
			case 'B':
				if (get_val(line_buffer, "Buffers:", data_line, 0)) {}
				break;
			case 'C':
				if (get_val(line_buffer, "Cached:", data_line, 0)) {}
				break;
			case 'S':
				switch (line_buffer[1])
				{
					case 'h':
						if (get_val(line_buffer, "Shmem:", data_line, 0)) {}
						break;
					case 'R':
						if (get_val(line_buffer, "SReclaimable:", data_line, 1)) {
							//goto done_parsing;
							// TODO: interesting, if we bail here, we always get the same values...

						}
						break;
				}
				break;
		}
	}

//done_parsing:
	send(socket, data_line, strlen(data_line), MSG_NOSIGNAL);
	send(socket, "\n", 1, MSG_NOSIGNAL);
}

/******************************************************************************/
int send_data (int socket)
{
	ssize_t sb;
	sb = send(socket, "event: total-cpu\n", 17, MSG_NOSIGNAL);
	if (sb <= 0) return sb;
	send_stat_file(socket);

	sb = send(socket, "event: total-mem\n", 17, MSG_NOSIGNAL);
	if (sb <= 0) return sb;
	send_meminfo_file(socket);

	rewinddir(proc_dir);
	sb = send(socket, "event: processes\n", 17, MSG_NOSIGNAL);
	if (sb <= 0) return sb;

	while ((ent = readdir(proc_dir)) != NULL)
	{
		if (ent->d_name[0] >= 49 && ent->d_name[0] <= 57)
		{
			data_line_len = parse_pid_stat_file(ent->d_name, data_line);
			if (data_line_len > 0) {
				sb = send(socket, data_line, data_line_len, MSG_NOSIGNAL);
				if (sb <= 0) return sb;
			}
		}
	}

	sb = send(socket, "\n", 1, MSG_NOSIGNAL);

	return sb;
}

/******************************************************************************/
void handle_options ()
{
	char *env_port = getenv("HTTP_PORT");
	char *env_address = getenv("HTTP_ADDRESS");
	char *env_interval = getenv("SCAN_INTERVAL");
	char *env_root = getenv("APP_ROOT");

	if (env_port != NULL) http_port = atoi(env_port);
	if (env_address != NULL) http_address = env_address;
	if (env_interval != NULL) wait_interval = atoi(env_interval);
	if (env_root != NULL) app_root = env_root;
}

regex_t regex;
int reti;
/*****************************************************************************/
void concat_possible_html_imports (
	char *input_path,
	FILE *out_stream
) {
	FILE *in_stream;
	char *line = NULL;
	size_t len = 0;
	ssize_t nread;
	regmatch_t pmatch[1];

	in_stream = fopen(input_path, "r");

	if (in_stream == NULL) {
		printf("html-import file not found: %s\n", input_path);
		return;
	}

	while ((nread = getline(&line, &len, in_stream)) != -1) {
		reti = regexec(&regex, line, 2, pmatch, REG_EXTENDED);
		if (!reti) {
			char *import_file = strndup(line + pmatch[1].rm_so, pmatch[1].rm_eo - pmatch[1].rm_so);
			char *import_path = dirname(input_path);
			strcpy(import_path, app_root);
			strcat(import_path, "/");
			strcat(import_path, import_file);
			// TODO: do not concat file that is already concatted...
			concat_possible_html_imports(import_path, out_stream);
		} else {
			fprintf(out_stream, line);
		}
	}

	free(line);
	fclose(in_stream);
}

/*****************************************************************************/
void create_html_concat_file (
	char *input_path,
	char *output_path
) {
	FILE *out_stream;

	out_stream = fopen(output_path, "wa");
	concat_possible_html_imports(input_path, out_stream);

	fclose(out_stream);
}

char *html_concat_path = "/tmp/ssetop-html-concat.html";
/*****************************************************************************/
int serve_file (const char *url, struct MHD_Connection *connection)
{
	int fd;
	int ret;
	struct stat sbuf;
	struct MHD_Response *response;
	char req_path[256] = "";

	strcat(req_path, app_root);
	strcat(req_path, url);

	char *dot = strrchr(req_path, '.');
	if (dot && !strcmp(dot, ".html")) {
		create_html_concat_file(req_path, html_concat_path);
		strcpy(req_path, html_concat_path);
	}

	if (
		(-1 == (fd = open(req_path, O_RDONLY)))
		|| (0 != fstat(fd, &sbuf))
		|| (!S_ISREG(sbuf.st_mode))
	){
		const char *page  = "500 error...\n";
		response = MHD_create_response_from_buffer(
			strlen(page),
			(void*) page,
			MHD_RESPMEM_PERSISTENT
		);
		ret = MHD_queue_response(connection, MHD_HTTP_INTERNAL_SERVER_ERROR, response);
		MHD_destroy_response(response);
		return ret;
	}

	response = MHD_create_response_from_fd(sbuf.st_size, fd);
	ret = MHD_queue_response(connection, MHD_HTTP_OK, response);
	MHD_destroy_response(response);

	return ret;
}

/******************************************************************************/
int serve_stream (struct MHD_Connection *connection)
{
	const union MHD_ConnectionInfo *ci;
	ssize_t sent_bytes;
	int ret;

	ci = MHD_get_connection_info(connection, MHD_CONNECTION_INFO_CONNECTION_FD);

	init_stream_socket(ci->connect_fd);

	while (1) {
		sent_bytes = send_data(ci->connect_fd);

		if (sent_bytes <= 0) {
			const char *page  = "TODO: how do we close a connection?\n";
			struct MHD_Response *response;
			response = MHD_create_response_from_buffer(strlen(page), (void*) page, MHD_RESPMEM_PERSISTENT);
			ret = MHD_queue_response(connection, MHD_HTTP_OK, response);
			MHD_destroy_response(response);
			return ret;
		}

		usleep(wait_interval * 1000);
	}

	return MHD_YES;
}

/******************************************************************************/
int http_request_handler (
	void *cls,
	struct MHD_Connection *connection,
	const char *url,
	const char *method,
	const char *version,
	const char *upload_data,
	size_t *upload_data_size,
	void **con_cls
){
	int ret;

	if (strcmp(url, "/event-stream") == 0) {
		ret = serve_stream(connection);
	} else {
		if (strcmp(url, "/") == 0) {
			url = "/main.html";
		}
		ret = serve_file(url, connection);
	}

	return ret;
}

/******************************************************************************/
int main ()
{
	handle_options();

	int reti;
	reti = regcomp(&regex, "rel=\"import\" href=\"([^\"]+)", REG_EXTENDED);
	if (reti) {
		fprintf(stderr, "Could not compile regex\n");
		exit(1);
	}

	proc_dir = opendir("/proc");
	stat_file = fopen("/proc/stat", "r");
	file_meminfo = fopen("/proc/meminfo", "r");

	struct sockaddr_in address;
	address.sin_family = AF_INET;
	address.sin_port = htons(http_port);
	inet_pton(AF_INET, http_address, &address.sin_addr);

	http_daemon = MHD_start_daemon (
		MHD_USE_SELECT_INTERNALLY,
		http_port,
		NULL,
		NULL,
		&http_request_handler,
		NULL,
		MHD_OPTION_SOCK_ADDR,
		&address,
		MHD_OPTION_END
	);

	signal(SIGINT, mom);
	signal(SIGTERM, mom);

	while (1) {
		sleep(1);
	}

	return 0;
}
