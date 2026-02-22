/**
 * @nuwax-ai/sdk - Nuwax AI SDK
 */
export interface CreateOpencodeOptions {
    engine?: 'opencode' | 'nuwaxcode';
    hostname?: string;
    port?: number;
    timeout?: number;
    opencodePath?: string;
    nuwaxcodePath?: string;
    config?: any;
    signal?: AbortSignal;
}
export interface CreateOpencodeClientOptions {
    baseUrl?: string;
    fetch?: typeof fetch;
}
export interface OpencodeClient {
    global: {
        health: () => Promise<any>;
    };
    app: {
        log: (body: any) => Promise<any>;
        agents: () => Promise<any>;
    };
    project: {
        list: () => Promise<any>;
        current: () => Promise<any>;
    };
    path: {
        get: () => Promise<any>;
    };
    config: {
        get: () => Promise<any>;
        providers: () => Promise<any>;
    };
    session: {
        list: () => Promise<any>;
        get: (path: any) => Promise<any>;
        children: (path: any) => Promise<any>;
        create: (body: any) => Promise<any>;
        delete: (path: any) => Promise<any>;
        update: (path: any, body: any) => Promise<any>;
        init: (path: any, body: any) => Promise<any>;
        abort: (path: any) => Promise<any>;
        share: (path: any) => Promise<any>;
        unshare: (path: any) => Promise<any>;
        summarize: (path: any, body: any) => Promise<any>;
        messages: (path: any) => Promise<any>;
        message: (path: any) => Promise<any>;
        prompt: (path: any, body: any) => Promise<any>;
        command: (path: any, body: any) => Promise<any>;
        shell: (path: any, body: any) => Promise<any>;
    };
}
export interface OpencodeServer {
    url: string;
    close: () => void;
}
export declare function createOpencode(options?: CreateOpencodeOptions): Promise<{
    client: OpencodeClient;
    server: OpencodeServer;
}>;
export declare function createOpencodeClient(options?: CreateOpencodeClientOptions): OpencodeClient;
declare const _default: {
    createOpencode: typeof createOpencode;
    createOpencodeClient: typeof createOpencodeClient;
};
export default _default;
//# sourceMappingURL=index.d.ts.map