"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const Generator = require("yeoman-generator");
const chalk_1 = __importDefault(require("chalk"));
const yosay_1 = __importDefault(require("yosay"));
const axios_1 = __importDefault(require("axios"));
class App extends Generator {
    constructor(args, opts) {
        super(args, opts);
    }
    async initializing() {
        const data = await (0, axios_1.default)("https://bestofui5.org/model/data.json");
        const ui5Model = data.data;
        this.types = ui5Model.types;
        this.packages = ui5Model.packages;
        this.middlewares = ui5Model.packages
            .filter(ui5Ext => ui5Ext.type === "middleware")
            .map(ui5Ext => {
            return `${ui5Ext.name} - ${ui5Ext.description}`;
        });
        this.tasks = ui5Model.packages
            .filter(ui5Ext => ui5Ext.type === "task")
            .map(ui5Ext => {
            return `${ui5Ext.name} - ${ui5Ext.description}`;
        });
        //create a txt file with the extension config
        ui5Model.packages.forEach(ui5Ext => {
            this.fs.write(`.generators/app/templates/${ui5Ext.name}.txt`, `${ui5Ext.readme}`);
        });
    }
    async prompting() {
        // Have Yeoman greet the user.
        this.log((0, yosay_1.default)(`Hello, let me help you get sorted with your ${chalk_1.default.red("ui5-tooling")}`));
        return this._getExtensions();
    }
    async writing() {
        // this.fs.copy(
        //   this.templatePath("dummyfile.txt"),
        //   this.destinationPath("dummyfile.txt")
        // );
        console.log(this.props);
    }
    _getExtensions() {
        let prompts = [
            {
                type: "checkbox",
                name: "ExtensionType",
                message: "Which extension type would you like to add?",
                choices: ["Middleware", "Task"],
                default: ["Middleware"],
                store: true
            },
            {
                type: "checkbox",
                name: "ExtensionsMiddleware",
                message: "Choose your middleware extensions?",
                when: (response) => response.ExtensionType.includes("Middleware"),
                choices: [...this.middlewares],
                store: true
            },
            {
                type: "checkbox",
                name: "ExtensionsTasks",
                message: "Choose your task extensions?",
                when: (response) => response.ExtensionType.includes("Task"),
                choices: [...this.tasks],
                store: true
            }
        ];
        this.middlewares.forEach((ui5Ext) => {
            const newVarPrompt = this._addVariables(ui5Ext, "middleware");
            if (newVarPrompt) {
                newVarPrompt.forEach((prompt) => {
                    prompts.push(prompt);
                });
            }
        });
        this.tasks.forEach((ui5Ext) => {
            const newVarPrompt = this._addVariables(ui5Ext, "tasks");
            if (newVarPrompt) {
                newVarPrompt.forEach((prompt) => {
                    prompts.push(prompt);
                });
            }
        });
        return this.prompt(prompts).then((props) => {
            // To access props later use this.props.someAnswer;
            this.props = props;
        });
    }
    _addVariables(ui5Package, type) {
        const ui5Ext = this.packages.find((ui5Ext1) => ui5Ext1.name === ui5Package.split(" - ")[0]);
        if (ui5Ext.jsdoc[type]) {
            const prompts = ui5Ext.jsdoc[type].params.map((param) => {
                return {
                    type: param.type === "boolean" ? "confirm" : "input",
                    name: `${ui5Ext.name}_${param.name}`,
                    message: `Add variable '${param.name}' for ${ui5Ext.name}`,
                    store: true,
                    when: (response) => response.ExtensionsMiddleware.includes(`${ui5Ext.name} - ${ui5Ext.description}`)
                };
            });
            return prompts;
        }
        else {
            return;
        }
    }
}
exports.App = App;
//# sourceMappingURL=App.js.map