import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
/** Plugin id — must be unique within the composed plugin tree. */
export declare const name = "dsh-md-table-export";
/** Declare the services this plugin needs; the loader waits for them. */
export declare const inject: string[];
/** Declarative, schema-validated deployment configuration. */
export interface Config {
    defaultOutputDir?: string;
    sheetPerTable?: boolean;
}
export declare const Config: Schema<Schemastery.ObjectS<{
    defaultOutputDir: Schema<string, string>;
    sheetPerTable: Schema<boolean, boolean>;
}>, Schemastery.ObjectT<{
    defaultOutputDir: Schema<string, string>;
    sheetPerTable: Schema<boolean, boolean>;
}>>;
/**
 * Plugin entry point (named export, no default export).
 * Registers the Markdown-table → Excel tool as a reversible effect so HMR and
 * plugin disposal clean it up automatically.
 */
export declare function apply(ctx: Context, config: Config): void;
