"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const Generator = require("yeoman-generator");
const yosay_1 = __importDefault(require("yosay"));
class App extends Generator {
    constructor(args, opts) {
        super(args, opts);
    }
    // public async initializing() {
    //   const data = await axios("https://ui5-community.github.io/model/data.json");
    //   const ui5Model: IUI5Model = data.data;
    //   this.types = ui5Model.types;
    //   this.packages = ui5Model.packages;
    //   this.middlewares = ui5Model.packages
    //     .filter(ui5Ext => ui5Ext.type === "middleware")
    //     .map(ui5Ext => {
    //       return `${ui5Ext.name} - ${ui5Ext.description}`;
    //     });
    //   this.tasks = ui5Model.packages
    //     .filter(ui5Ext => ui5Ext.type === "task")
    //     .map(ui5Ext => {
    //       return `${ui5Ext.name} - ${ui5Ext.description}`;
    //     });
    //   //create a txt file with the extension config
    //   ui5Model.packages.forEach(ui5Ext => {
    //     this.fs.write(
    //       `.generators/app/templates/${ui5Ext.name}.txt`,
    //       `${ui5Ext.readme}`
    //     );
    //   });
    // }
    async prompting() {
        // Have Yeoman greet the user.
        this.log((0, yosay_1.default)(`Hello, let's sort out the variables
        )}`));
        this.options.oneTimeConfig = this.config.getAll();
        console.log(this.config.getAll());
        const prompts = [
            {
                type: "checkbox",
                name: "ExtensionType",
                message: "Which extension type would you like to add?",
                choices: ["Middleware", "Task"],
                default: ["Middleware"]
            },
            {
                type: "checkbox",
                name: "ExtensionsMiddleware",
                message: "Choose your middleware extensions?",
                when: (response) => response.ExtensionType.includes("Middleware"),
                choices: [...this.middlewares]
            },
            {
                type: "checkbox",
                name: "ExtensionsTasks",
                message: "Choose your task extensions?",
                when: (response) => response.ExtensionType.includes("Task"),
                choices: [...this.tasks]
            }
        ];
        return this.prompt(prompts).then((props) => {
            // To access props later use this.props.someAnswer;
            this.props = props;
        });
    }
    async writing() {
        // this.fs.copy(
        //   this.templatePath("dummyfile.txt"),
        //   this.destinationPath("dummyfile.txt")
        // );
        console.log(this.props);
    }
}
exports.App = App;
//# sourceMappingURL=Variables.js.map