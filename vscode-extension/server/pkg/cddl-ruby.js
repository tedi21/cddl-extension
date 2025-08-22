"use strict";

const cddl_operation = {
    VERIFY: 1,
    GENERATE: 2,
    VALIDATE: 3,
};

let RubyVM;
let out = "";
let err = "";
let inProgress = false;
let waitingTask = {
    state: false
};

async function cddl_init() {
    const createModule = __non_webpack_require__(__dirname + "/../pkg/dist/ruby.js");

    const defaultModule = {
        locateFile: (path) => __dirname + "/../pkg/dist/" + path,
        setStatus: (msg) => {
            //console.log("status " + msg);
        },
        print: (line) => {
            //console.log("out: " + line);
            out += line + '\n';
        },
        printErr: (line) => {
            //console.log("err: " + line);
            err += line + '\n';
        },
        onRuntimeInitialized: () => {
            //console.log("RubyVM runtime initialized");
        }
    };
    RubyVM = await createModule(defaultModule);
    let args = await new RubyVM.StringVector();
    if (args != null) {
        await args.push_back('RubyVM');
        await args.push_back('-e');
        await args.push_back(`
            require 'cddl'
            require 'json'
        `);
        await RubyVM.exec(args);
    }
}

async function cddl_eval(operation, txt, json) {
    try {
        if (RubyVM === undefined) {
            await cddl_init();
        }
        var expression = `
            begin 
                cddlTxt = <<-EOF\n` + txt.replace(/\r\n/g, ' \n').replace(/[\\]/g, '\\$&') + `\nEOF
                parser ||= CDDL::Parser.new(cddlTxt)
        `;
        if (operation == 2) {
            expression += `
                g = parser.generate
                puts JSON.pretty_generate(g)
            `;
        }
        if (operation == 3) {
            expression += `
                jsonTxt = <<-EOF\n` + json.replace(/\r\n/g, ' \n').replace(/[\\]/g, '\\$&') + `\nEOF
                json = JSON.load(jsonTxt)
                parser.validate(json)
            `;
        }
        expression += `
            rescue => error
                warn error.message
            else
                puts '*** OK'
            end
        `;
        out = "";
        err = "";
        await RubyVM.eval(expression);
    } catch (error) {
        //console.error(error);
    }
}

async function cddl_ruby(operation, txt, json) {
    waitingTask = {
        operation: operation,
        txt: txt,
        json: json,
        state: true
    };
    if (!inProgress) {
        inProgress = true;
        while (waitingTask.state) {
            waitingTask.state = false;
            await cddl_eval(waitingTask.operation, waitingTask.txt, waitingTask.json);
        }
        inProgress = false;
    }
    return {
        result: (out.length != 0),
        output: out.trim() + '\n' + err.trim()
    };
}

module.exports = {
    cddl_ruby: cddl_ruby,
    cddl_operation: cddl_operation
}