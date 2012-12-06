REM jasmone-node doesn't produce html output, only textual
REM currently it also fails to locate my source code refered by my spec -
REM   in pure Jasmine that is specified in the html file, probably specified some other way for Jasmine-node
node node_modules/jasmine-node/lib/jasmine-node/cli.js Jasmine/spec
pause
