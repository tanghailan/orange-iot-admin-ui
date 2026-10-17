/**
 * @name 代理的配置
 * @see 在生产环境 代理是无法生效的，所以这里没有生产环境的配置
 * -------------------------------
 * The agent cannot take effect in the production environment
 * so there is no configuration of the production environment
 * For details, please see
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */
const target = process.env.IOT_ADMIN_API_URL || 'http://localhost:8811';

const adminProxy = {
  '/admin/': {
    target,
    changeOrigin: true,
    pathRewrite: {
      '^/admin': '/api/v1/admin',
    },
  },
};

export default {
  dev: adminProxy,
  test: adminProxy,
  pre: adminProxy,
};
