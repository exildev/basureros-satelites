@echo off
echo Comprimiendo..

echo Lib General
cd elements
mkdir lib
cd ..
xcopy "bower_components/web-animations-js" "elements/lib/web-animations-js" /Y /I
xcopy "bower_components/webcomponentsjs" "elements/lib/webcomponentsjs" /Y /I
vulcanize elements/lib.html --inline-script --inline-css | crisper --html elements/lib/lib.v.html --js elements/lib/lib.v.js
