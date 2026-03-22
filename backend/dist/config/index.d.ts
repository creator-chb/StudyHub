/**
 * 环境变量配置加载模块
 * 统一管理所有环境变量，提供类型安全的访问
 */
interface Config {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    db: {
        user: string;
        password: string;
        host: string;
        port: number;
        database: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map