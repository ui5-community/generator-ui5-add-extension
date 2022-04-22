"use strict";
import Generator = require("yeoman-generator");
import chalk from "chalk";
import yosay from "yosay";
import axios from "axios";
import inquirer, { Inquirer } from "inquirer";
interface IGitRepo {
  type: string;
  url: string;
  directory: string;
}

interface IPackage {
  name: string;
  version: string;
  description: string;
  private: boolean;
  author: string;
  license: string;
  repository: IGitRepo;
  readme: string;
  dependencies: object;
  type: string;
  forks: number;
  stars: number;
  githublink: string;
  downloads: number;
}
interface IUI5Model {
  types: string[];
  packages: IPackage[];
}

interface IGeneratorOptions {
  name: string;
  description: string;
  type: "list" | "checkbox" | "input" | "confirm" | "password" | "number";
  when: boolean | Function;
  choices?: string[];
}
export class App extends Generator {
  [x: string]: any;
  props: any;
  public constructor(args: string[], opts: []) {
    super(args, opts);
  }
  public async initializing() {
    const data = await axios("https://bestofui5.org/model/data.json");
    const ui5Model: IUI5Model = data.data;
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
      this.fs.write(
        `.generators/app/templates/${ui5Ext.name}.txt`,
        `${ui5Ext.readme}`
      );
    });
  }

  public async prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Hello, let me help you get sorted with your ${chalk.red(
          "ui5-tooling"
        )}`
      )
    );

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
        when: (response: { ExtensionType: string | string[] }) =>
          response.ExtensionType.includes("Middleware"),
        choices: [...this.middlewares]
      },
      {
        type: "checkbox",
        name: "ExtensionsTasks",
        message: "Choose your task extensions?",
        when: (response: { ExtensionType: string | string[] }) =>
          response.ExtensionType.includes("Task"),
        choices: [...this.tasks]
      }
    ];

    return this.prompt(prompts).then((props: any) => {
      // To access props later use this.props.someAnswer;
      this.props = props;
    });
  }

  public async writing() {
    // this.fs.copy(
    //   this.templatePath("dummyfile.txt"),
    //   this.destinationPath("dummyfile.txt")
    // );
    console.log(this.props);
  }

  // public async install() {
  //   this.installDependencies();
  // }
}
