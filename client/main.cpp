#include <QApplication>
#include <QWebEngineView>
#include <QCommandLineParser>
#include <QtPlatformHeaders/QXcbWindowFunctions>
#include <QDesktopWidget>
#include <QSettings>
#include <QJsonObject>

int main (int argc, char *argv[])
{
	QJsonObject conf;
	conf["url"] = "http://localhost:55301/";
	conf["top"] = 0;
	conf["left"] = 0;
	conf["width"] = 120;
	conf["height"] = 600;
	conf["on-top"] = false;
	conf["no-hint"] = false;
	conf["no-shadow"] = false;
	conf["no-border"] = false;
	conf["as-dock"] = false;

	QApplication app(argc, argv);
	QSettings settings("ssetop", "client");
	QWebEngineView view;
	QCommandLineParser parser;
	Qt::WindowFlags flags = 0;

	QApplication::setApplicationName("ssetop-client");
	QApplication::setApplicationVersion("0.1.0");

	parser.setApplicationDescription("QWebEngineView with WM flags");
	parser.addHelpOption();
	parser.addVersionOption();
	parser.addPositionalArgument("url", "URL to load");

	foreach (const QString &key, conf.keys()) {
		parser.addOption({
			{key},
			"todo1",
			"todo2",
			conf[key].toVariant().toString()
		});
	}

	//parser.process(app); // TODO this wont allow --enable-experimental-web-platform-features
	parser.parse(app.arguments());

	foreach (const QString &key, conf.keys()) {
		if (settings.contains(key)) {
			if (conf[key].isBool()) conf[key] = settings.value(key).toBool();
			if (conf[key].isDouble()) conf[key] = settings.value(key).toDouble();
			if (conf[key].isString()) conf[key] = settings.value(key).toString();
		}
		if (parser.isSet(key)) {
			if (conf[key].isBool()) conf[key] = true;
			if (conf[key].isDouble()) conf[key] = parser.value(key).toDouble();
			if (conf[key].isString()) conf[key] = parser.value(key);
		}
	}

	const QStringList args = parser.positionalArguments();
	if (!args.isEmpty()) {
		conf["url"] = args.at(0);
	}

	if (conf["on-top"].toBool()) {
		flags |= Qt::WindowStaysOnTopHint;
	}
	if (conf["no-hint"].toBool()) {
		flags |= Qt::BypassWindowManagerHint;
	}
	if (conf["no-shadow"].toBool()) {
		flags |= Qt::NoDropShadowWindowHint;
	}
	if (conf["no-border"].toBool()) {
		flags |= Qt::FramelessWindowHint;
	}
	if (conf["as-dock"].toBool()) {
		view.winId();
		QWindow *win = view.windowHandle();
		QXcbWindowFunctions::setWmWindowType(win, QXcbWindowFunctions::Dock);
	}

	view.setWindowFlags(flags);

	int width = conf["width"].toInt();
	int height = conf["height"].toInt();
	if (width == 0) {
		width = QApplication::desktop()->availableGeometry().width();
	}
	if (height == 0) {
		height = QApplication::desktop()->availableGeometry().height();
	}

	view.resize(width, height);
	view.move(conf["left"].toInt(), conf["top"].toInt());

	view.show();
	view.load(conf["url"].toString());

	return app.exec();
}
