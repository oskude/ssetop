# ssetop

ssetop is a responsive server/client based linux process monitor…

![screenshot](screenshot.gif?raw=true)

sorry, the insides don't give me a warm fuzzy feeling yet, so documentation has to wait.

but curious people can:

```
git clone --recursive https://github.com/oskude/ssetop
cd ssetop
make
APP_ROOT="$PWD/webapp/" HTTP_ADDRESS=127.0.0.1 HTTP_PORT=55370 ./ssetop-server
# from another terminal:
./ssetop-client --enable-experimental-web-platform-features http://127.0.0.1:55370
```

and report any issues.

cheers  
.andre

> ps. requirements are: _standard-linux-build-system_, qt5.9+ and libmicrohttpd.
