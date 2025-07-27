const process = require('node:process');

(async () => {
    if (process.argv[2] === 'child') {
        const txt = process.argv[3];
        const operation = process.argv[4];

        const { loadRuby } = require("@ruby/head-wasm-emscripten");

        var out = "";
        StreamOut = function (txt) {
            out += txt + '\n';
            //console.log(txt);
        }

        var err = "";
        StreamError = function (txt) {
            err += txt + '\n';
            //console.log(txt);
        }

        const main = function () {
            return new Promise((resolve, reject) => {
                var expression = `
                    begin 
                        require "cddl"
                        require "json"

                        txt = '` + txt.replace(/\r\n/g, ' \n').replace(/['\\]/g, '\\$&') + `'
                        parser ||= CDDL::Parser.new(txt)
                `;
                if (operation == 2) {
                    expression += `
                        g = parser.generate
                        puts JSON.pretty_generate(g)
                    `;
                }
                expression += `
                    rescue => error
                        warn error.message
                    else
                        puts '*** OK'
                    ensure
                        puts '\xFF'
                    end
                `;
                const args = ["-e", expression];
                //txt = '` + txt.replace(/[']/g, '\\$&').replace(/\.pcre/g, ';$&') + `'
                //console.log(`$ ruby.wasm ${args.join(" ")}`);
                const defaultModule = {
                    locateFile: (path) => __dirname + "/../pkg/node_modules/@ruby/head-wasm-emscripten/dist/" + path,
                    setStatus: (msg) => {
                        //console.log("status " + msg);
                    },
                    print: (line) => {
                        if (line == '\xFF') {
                            resolve();
                        }
                        else {
                            StreamOut(line);
                        }
                    },
                    printErr: (line) => {
                        StreamError(line);
                    },
                    arguments: args,
                };
                loadRuby(defaultModule);
            });
        };
        await main();
        process.send({ result: (out.length != 0), output: out.trim() + '\n' + err.trim()});
        process.exit(0);
    }
})();  