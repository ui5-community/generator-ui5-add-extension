import Generator = require("yeoman-generator");
interface IUi5Yaml {
    specVersion: string;
    metadata: {
        name: string;
    };
    resources: any;
    type: string;
    server?: {
        customMiddleware?: any[];
    };
    builder?: {
        customTasks: any[];
    };
}
export declare class App extends Generator {
    [x: string]: any;
    props: any;
    ui5Yaml: IUi5Yaml;
    currentWriteExt: string;
    sortOrder: string[];
    constructor(args: string[], opts: []);
    initializing(): Promise<void>;
    prompting(): Promise<void>;
    writing(): Promise<void>;
    private _getExtensions;
    private _addVariables;
    private _promTooling;
    private _promMiddleware;
    private _promTasks;
    private _termilink;
}
export {};
//# sourceMappingURL=App.d.ts.map