const process = require('node:process');

(async () => {
    if (process.argv[2] === 'child') {
        const operation = process.argv[3];
        const txt = process.argv[4];
        const json = process.argv[5];

        const { loadRuby } = require(__dirname + "/../pkg/dist/index.js");

        var out = "";
        StreamOut = function (str) {
            out += str + '\n';
            //console.log(txt);
        }

        var err = "";
        StreamError = function (str) {
            err += str + '\n';
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
                if (operation == 3) {
                    expression += `
                        json = JSON.load('` + json.replace(/\r\n/g, ' \n').replace(/['\\]/g, '\\$&') + `')
                        parser.validate(json)
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
                    locateFile: (path) => __dirname + "/../pkg/dist/" + path,
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