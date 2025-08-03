const cddl_operation = {
    VERIFY: 1,
    GENERATE: 2,
    VALIDATE: 3,
};

async function cddl_ruby(operation, txt, json) {
    return new Promise((resolve, reject) => {
        const { loadRuby } = require(__dirname + "/../pkg/dist/index.js");

        var out = "";
        StreamOut = function (str) {
            if (str == '\xFF') {
                resolve({
                    result: (out.length != 0), 
                    output: out.trim() + '\n' + err.trim()
                });
            }
            else {        
                out += str + '\n';
            }
            //console.log(txt);
        }

        var err = "";
        StreamError = function (str) {
            err += str + '\n';
            //console.log(txt);
        }

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
        const defaultModule = {
            locateFile: (path) => __dirname + "/../pkg/dist/" + path,
            setStatus: (msg) => {
                //console.log("status " + msg);
            },
            print: (line) => {
                StreamOut(line);
            },
            printErr: (line) => {
                StreamError(line);
            },
            arguments: args,
        };
        loadRuby(defaultModule);
    });
}

module.exports = {
    cddl_ruby: cddl_ruby,
    cddl_operation: cddl_operation
}