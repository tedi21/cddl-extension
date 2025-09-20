"use strict";

const cddl_operation = {
    VERIFY: 1,
    GENERATE: 2,
    VALIDATE: 3,
};

const result_code = {
    SUCCESS: 0,
    ERROR: 1,
    BUSY: 2  
};

const sleepMs = ms => new Promise(r => setTimeout(r, ms));

let RubyVM;
let Out = "";
let Err = "";
const Tasks = {
  current: 0,
  inProgress: new Map()
};


async function cddl_init() {
    Tasks.inProgress.set(cddl_operation.VERIFY, undefined);
    Tasks.inProgress.set(cddl_operation.GENERATE, undefined);
    Tasks.inProgress.set(cddl_operation.VALIDATE, undefined);

    const createModule = __non_webpack_require__(__dirname + "/../pkg/dist/ruby.js");

    const defaultModule = {
        locateFile: (path) => __dirname + "/../pkg/dist/" + path,
        setStatus: (msg) => {
            //console.log("status " + msg);
        },
        print: (line) => {
            //console.log("out: " + line);
            Out += line + '\n';
        },
        printErr: (line) => {
            //console.log("err: " + line);
            Err += line + '\n';
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
                cddlTxt = <<-'EOF'\n` + txt.replace(/\r\n/g, ' \n') + `\nEOF
                parser ||= CDDL::Parser.new(cddlTxt)
        `;
        if (operation === 2) {
            expression += `
                g = parser.generate
                puts JSON.pretty_generate(g)
            `;
        }
        if (operation === 3) {
            expression += `
                jsonTxt = <<-'EOF'\n` + json.replace(/\r\n/g, ' \n') + `\nEOF
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
        Out = "";
        Err = "";
        await RubyVM.eval(expression);
    } catch (error) {
        //console.error(error);
    }
}

async function processTask(operation) {
    // Pop the task and process it
    Tasks.current = operation;
    while (Tasks.inProgress[operation] != undefined) {
        const parameters = Tasks.inProgress[operation];
        Tasks.inProgress[operation] = undefined;
        await cddl_eval(operation, parameters.txt, parameters.json);
    }
    Tasks.current = 0;
    let result = result_code.ERROR;
    if (Out.length !== 0) {
        result = result_code.SUCCESS;
    }
    return result;
}

async function cddl_ruby(operation, txt, json) {
    let res = result_code.ERROR;
    if (Tasks.current === 0) {
        // Push the task and start the processing
        Tasks.inProgress[operation] = { txt: txt, json: json };
        res = await processTask(operation);
    }
    else if ((Tasks.current !== operation)
        && (Tasks.inProgress[operation] == undefined)) {
        // Push the task, wait the end of the other operation and start the processing
        Tasks.inProgress[operation] = { txt: txt, json: json };
        while (Tasks.current !== 0) {
            await sleepMs(10);
        }
        res = await processTask(operation);
    }
    else {
        // Push the task
        Tasks.inProgress[operation] = { txt: txt, json: json };
        res = result_code.BUSY;
    }
    //console.log(res + ": " + Out.trim() + " / " + Err.trim());
    return {result: res, output: Out.trim() + '\n' + Err.trim()};
}

module.exports = {
    cddl_ruby: cddl_ruby,
    cddl_operation: cddl_operation
}