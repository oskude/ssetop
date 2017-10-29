.PHONY: all server client clean install uninstall archlinux

PREFIX ?= /usr/local

all: server client

server:
	# TODO: something in concat_possible_html_imports() triggers
	# *** stack smashing detected *** without -fno-stack-protector
	$(CC) -Wall -fno-stack-protector -lmicrohttpd -o ssetop-server server/main.c

client:
	mkdir -p client-build
	cd client-build; \
		qmake ../client/ssetop-client.pro; \
		make
	mv client-build/ssetop-client .

clean:
	rm -f ssetop-server
	rm -f ssetop-client
	rm -rf client-build
	rm -rf distro/archlinux/pkg
	rm -rf distro/archlinux/src
	rm -rf distro/archlinux/ssetop
	rm -f distro/archlinux/*.pkg.tar.xz

install:
	install -D -m755 ssetop-server "$(DESTDIR)$(PREFIX)/bin/ssetop-server"
	install -D -m755 ssetop-client "$(DESTDIR)$(PREFIX)/bin/ssetop-client"
	install -d "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/oskude/ssetop"
	install -D webapp/*.html "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/"
	install -D webapp/oskude/*.html "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/oskude/"
	install -D webapp/oskude/ssetop/*.html "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/oskude/ssetop/"
	install -D -m644 scripts/ssetop-server.service "$(DESTDIR)$(PREFIX)/lib/systemd/system/ssetop-server.service"
	install -D -m644 scripts/ssetop-client.desktop "$(DESTDIR)$(PREFIX)/share/applications/ssetop-client.desktop"

uninstall:
	rm -f "$(DESTDIR)$(PREFIX)/bin/ssetop-server"
	rm -f "$(DESTDIR)$(PREFIX)/bin/ssetop-client"
	rm -f "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/oskude/ssetop/"*.html
	rm -f "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/oskude/"*.html
	rm -f "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/"*.html
	rmdir "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/oskude/ssetop" || true
	rmdir "$(DESTDIR)$(PREFIX)/share/ssetop/webapp/oskude" || true
	rmdir "$(DESTDIR)$(PREFIX)/share/ssetop/webapp" || true
	rm -f "$(DESTDIR)$(PREFIX)/lib/systemd/system/ssetop-server.service"
	rm -f "$(DESTDIR)$(PREFIX)/share/applications/ssetop-client.desktop"

archlinux:
	cd distro/archlinux; \
		makepkg -f
