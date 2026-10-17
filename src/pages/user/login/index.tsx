import {
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Helmet, history, useIntl, useModel } from '@umijs/max';
import { App } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { adminLogin } from '@/services/iot';
import Settings from '../../../../config/defaultSettings';

/**
 * Validate redirect URL to prevent open redirect attacks.
 * Only allow same-origin relative paths starting with '/'.
 */
const getSafeRedirectUrl = (redirect: string | null): string => {
  const fallback = '/iot/dashboard';
  if (
    !redirect?.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.includes('\\')
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(redirect, window.location.origin);
    if (
      parsed.origin !== window.location.origin ||
      parsed.pathname === '/user/login'
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};

const useStyles = createStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100dvh',
    width: '100%',
    padding: '24px clamp(16px, 4vw, 48px) 14px',
    overflowX: 'hidden',
    background: '#eef0ed',
    color: '#27363a',
    fontFamily: 'AlibabaSans, sans-serif',
  },
  shell: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.12fr) minmax(420px, 0.88fr)',
    width: '100%',
    maxWidth: 1220,
    height: 'min(760px, calc(100dvh - 82px))',
    minHeight: 620,
    margin: 'auto 0',
    overflow: 'hidden',
    borderRadius: 20,
    background: '#fbfcfa',
    boxShadow: '0 22px 64px rgba(34, 49, 49, 0.12)',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
      width: '100%',
      maxWidth: 560,
      height: 'auto',
      minHeight: 0,
      margin: 'auto 0',
    },
  },
  intro: {
    display: 'flex',
    flexDirection: 'column',
    padding: 'clamp(32px, 5vw, 62px)',
    background: '#20363a',
    color: '#f5f5ef',
    '@media (max-width: 900px)': {
      padding: '30px 32px',
    },
    '@media (max-width: 560px)': {
      padding: '24px 22px',
    },
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    display: 'block',
    width: 42,
    height: 42,
    objectFit: 'contain',
  },
  brandName: {
    color: '#f7f7f2',
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '0.01em',
    lineHeight: 1.2,
    '& span': {
      color: '#ed8953',
    },
  },
  brandMeta: {
    marginTop: 4,
    color: 'rgba(231, 238, 232, 0.58)',
    fontSize: 11,
    letterSpacing: '0.03em',
  },
  introMain: {
    maxWidth: 520,
    margin: 'auto 0 0',
    paddingTop: 76,
    '@media (max-width: 900px)': {
      paddingTop: 42,
    },
    '@media (max-width: 560px)': {
      paddingTop: 34,
    },
  },
  platformLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    color: '#c5d3cd',
    fontSize: 13,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ed8953',
  },
  heroTitle: {
    margin: '20px 0 16px',
    color: '#f6f5ef',
    fontSize: 'clamp(34px, 4.1vw, 52px)',
    fontWeight: 650,
    letterSpacing: '-0.045em',
    lineHeight: 1.24,
    '& span': {
      color: '#ed8953',
    },
    '@media (max-width: 900px)': {
      fontSize: 38,
    },
    '@media (max-width: 560px)': {
      margin: '16px 0 12px',
      fontSize: 32,
    },
  },
  heroCopy: {
    maxWidth: 460,
    margin: 0,
    color: 'rgba(230, 237, 231, 0.7)',
    fontSize: 14,
    lineHeight: 1.85,
  },
  moduleList: {
    marginTop: 64,
    borderTop: '1px solid rgba(225, 236, 228, 0.16)',
    '@media (max-width: 900px)': {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
      marginTop: 34,
      borderTop: 0,
    },
    '@media (max-width: 560px)': {
      gap: 8,
      marginTop: 26,
    },
  },
  moduleRow: {
    display: 'grid',
    gridTemplateColumns: '34px minmax(100px, 0.75fr) 1fr',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderBottom: '1px solid rgba(225, 236, 228, 0.16)',
    '@media (max-width: 900px)': {
      display: 'block',
      minHeight: 0,
      padding: '12px 10px',
      border: '1px solid rgba(225, 236, 228, 0.16)',
      borderRadius: 9,
    },
    '@media (max-width: 560px)': {
      padding: '10px 8px',
    },
  },
  moduleNumber: {
    color: '#ed8953',
    fontSize: 11,
    fontVariantNumeric: 'tabular-nums',
    '@media (max-width: 900px)': {
      display: 'block',
      marginBottom: 6,
    },
  },
  moduleName: {
    color: '#f1f3ed',
    fontSize: 13,
    fontWeight: 600,
    '@media (max-width: 560px)': {
      fontSize: 12,
    },
  },
  moduleDescription: {
    color: 'rgba(225, 236, 228, 0.52)',
    fontSize: 12,
    '@media (max-width: 900px)': {
      display: 'none',
    },
  },
  loginPanel: {
    display: 'flex',
    flexDirection: 'column',
    padding: '28px clamp(28px, 5vw, 64px) 30px',
    background: '#fbfcfa',
    '@media (max-width: 900px)': {
      minHeight: 470,
      padding: '22px 32px 28px',
    },
    '@media (max-width: 560px)': {
      minHeight: 430,
      padding: '18px 22px 24px',
    },
  },
  panelTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
    color: '#77837f',
    fontSize: 12,
  },
  loginContent: {
    width: '100%',
    maxWidth: 370,
    margin: 'auto',
  },
  loginOverline: {
    marginBottom: 10,
    color: '#c8784b',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
  loginTitle: {
    margin: 0,
    color: '#26373a',
    fontSize: 34,
    fontWeight: 650,
    letterSpacing: '-0.04em',
    lineHeight: 1.3,
    '@media (max-width: 560px)': {
      fontSize: 30,
    },
  },
  loginSubtitle: {
    margin: '9px 0 30px',
    color: '#7b8782',
    fontSize: 14,
    lineHeight: 1.7,
  },
  form: {
    ':global(.ant-form-item)': {
      marginBottom: 19,
    },
    ':global(.ant-form-item-label > label)': {
      color: '#44534f',
      fontSize: 13,
      fontWeight: 500,
    },
    ':global(.ant-form-item-explain-error)': {
      color: '#bd583c',
    },
    ':global(.ant-input-affix-wrapper)': {
      minHeight: 50,
      padding: '0 14px',
      border: '1px solid #dce2de',
      borderRadius: 9,
      background: '#fff !important',
      boxShadow: 'none',
    },
    ':global(.ant-input-affix-wrapper:hover)': {
      borderColor: '#c4a18c',
    },
    ':global(.ant-input-affix-wrapper-focused)': {
      borderColor: '#d77b4b',
      boxShadow: '0 0 0 3px rgba(215, 123, 75, 0.12)',
    },
    ':global(.ant-input)': {
      color: '#26373a',
      background: 'transparent !important',
      fontSize: 14,
    },
    ':global(.ant-input::placeholder)': {
      color: '#a1aaa5',
    },
    ':global(.ant-input-prefix)': {
      marginRight: 11,
      color: '#88938e',
    },
    ':global(input:-webkit-autofill)': {
      WebkitBoxShadow: '0 0 0 1000px #fff inset',
      WebkitTextFillColor: '#26373a',
      caretColor: '#26373a',
      borderRadius: 7,
    },
    ':global(.ant-btn-primary)': {
      height: 50,
      border: '1px solid #df7845',
      borderRadius: 9,
      background: '#df7845',
      boxShadow: 'none',
      color: '#fff',
      fontSize: 14,
      fontWeight: 600,
      transition: 'background 160ms ease, border-color 160ms ease',
    },
    ':global(.ant-btn-primary:hover)': {
      borderColor: '#c96637',
      background: '#c96637',
      color: '#fff',
    },
  },
  securityNote: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 25,
    paddingTop: 18,
    borderTop: '1px solid #e9ece8',
    color: '#7f8b86',
    fontSize: 12,
    lineHeight: 1.6,
  },
  securityIcon: {
    flex: '0 0 auto',
    color: '#c8784b',
    fontSize: 15,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1220,
    padding: '12px 2px 0',
    color: '#818b86',
    fontSize: 11,
    '@media (max-width: 900px)': {
      display: 'none',
    },
  },
  footerAccent: {
    color: '#c8784b',
    fontWeight: 600,
  },
}));

const Login: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();

  const fetchUserInfo = async (): Promise<API.CurrentUser | undefined> => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      const [accessCodes, menus] = await Promise.all([
        initialState?.fetchAccessCodes?.() || Promise.resolve([]),
        initialState?.fetchMenus?.() || Promise.resolve([]),
      ]);
      setInitialState((state) => ({
        ...state,
        currentUser: userInfo,
        accessCodes,
        menus,
      }));
    }
    return userInfo;
  };

  const handleSubmit = async (values: API.AdminLoginRequest) => {
    try {
      const msg = await adminLogin(values);

      if (msg.code === 0 && msg.data) {
        const defaultLoginSuccessMessage = intl.formatMessage({
          id: 'pages.login.success',
          defaultMessage: '登录成功！',
        });

        localStorage.setItem('iot_admin_token', msg.data.accessToken);

        const userInfo = await fetchUserInfo();
        if (!userInfo) {
          localStorage.removeItem('iot_admin_token');
          setInitialState((state) => ({
            ...state,
            currentUser: undefined,
            accessCodes: [],
          }));
          message.error('无法获取登录用户信息，请重新登录。');
          return;
        }

        message.success(defaultLoginSuccessMessage);
        const urlParams = new URL(window.location.href).searchParams;
        const redirectUrl = getSafeRedirectUrl(urlParams.get('redirect'));
        history.replace(redirectUrl);
      }
    } catch (error) {
      console.error('登录错误:', error);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: '登录页',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>

      <main className={styles.shell}>
        <section className={styles.intro}>
          <div className={styles.brand}>
            <img
              className={styles.brandMark}
              src={Settings.logo || '/orange-iot.svg'}
              alt="Orange IoT"
            />
            <div>
              <div className={styles.brandName}>
                Orange <span>IoT</span>
              </div>
              <div className={styles.brandMeta}>物联网管理平台</div>
            </div>
          </div>

          <div className={styles.introMain}>
            <div className={styles.platformLabel}>
              <span className={styles.platformDot} />
              统一管理设备与平台服务
            </div>
            <h1 className={styles.heroTitle}>
              设备接入与运维，
              <br />
              <span>在一个平台完成。</span>
            </h1>
            <p className={styles.heroCopy}>
              集中管理产品、设备、消息和权限，日常运维所需功能都在这里。
            </p>
          </div>

          <section className={styles.moduleList} aria-label="平台功能">
            <div className={styles.moduleRow}>
              <span className={styles.moduleNumber}>01</span>
              <span className={styles.moduleName}>产品与设备</span>
              <span className={styles.moduleDescription}>
                接入信息与设备状态
              </span>
            </div>
            <div className={styles.moduleRow}>
              <span className={styles.moduleNumber}>02</span>
              <span className={styles.moduleName}>消息与任务</span>
              <span className={styles.moduleDescription}>
                消息记录与运维计划
              </span>
            </div>
            <div className={styles.moduleRow}>
              <span className={styles.moduleNumber}>03</span>
              <span className={styles.moduleName}>账号与权限</span>
              <span className={styles.moduleDescription}>
                用户、角色与菜单配置
              </span>
            </div>
          </section>
        </section>

        <section className={styles.loginPanel}>
          <div className={styles.panelTop}>
            <span>管理员入口</span>
          </div>

          <div className={styles.loginContent}>
            <div className={styles.loginOverline}>Orange IoT 管理平台</div>
            <h2 className={styles.loginTitle}>登录控制台</h2>
            <p className={styles.loginSubtitle}>请输入管理员账号和密码。</p>

            <div className={styles.form}>
              <LoginForm
                style={{ width: '100%', maxWidth: '100%' }}
                containerStyle={{ width: '100%', height: 'auto', padding: 0 }}
                contentStyle={{
                  width: '100%',
                  minWidth: 0,
                  maxWidth: '100%',
                }}
                submitter={{
                  searchConfig: {
                    submitText: '登录',
                  },
                  submitButtonProps: {
                    size: 'large',
                    block: true,
                    style: {
                      height: 50,
                      borderRadius: 9,
                      borderColor: '#df7845',
                      background: '#df7845',
                      color: '#fff',
                      boxShadow: 'none',
                    },
                  },
                }}
                onFinish={async (values) => {
                  await handleSubmit(values as API.AdminLoginRequest);
                }}
              >
                <ProFormText
                  name="username"
                  label="管理员账号"
                  fieldProps={{
                    size: 'large',
                    prefix: <UserOutlined />,
                    autoComplete: 'username',
                  }}
                  style={{ width: '100%' }}
                  placeholder="请输入管理员账号"
                  rules={[
                    {
                      required: true,
                      message: '请输入用户名!',
                    },
                  ]}
                />
                <ProFormText.Password
                  name="password"
                  label="密码"
                  fieldProps={{
                    size: 'large',
                    prefix: <LockOutlined />,
                    autoComplete: 'current-password',
                  }}
                  style={{ width: '100%' }}
                  placeholder="请输入密码"
                  rules={[
                    {
                      required: true,
                      message: '请输入密码！',
                    },
                  ]}
                />
              </LoginForm>
            </div>

            <div className={styles.securityNote}>
              <SafetyCertificateOutlined className={styles.securityIcon} />
              仅限授权管理员访问
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>
          Orange <span className={styles.footerAccent}>IoT</span> 管理平台
        </span>
        <span>© {year}</span>
      </footer>
    </div>
  );
};

export default Login;
