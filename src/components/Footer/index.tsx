import { createStyles } from 'antd-style';
import React from 'react';

const useStyles = createStyles(({ token }) => ({
  footer: {
    padding: '16px 24px',
    textAlign: 'center',
    color: token.colorTextDescription,
    fontSize: token.fontSizeSM,
    lineHeight: token.lineHeight,
    background: 'transparent',
  },
}));

const Footer: React.FC = () => {
  const { styles } = useStyles();
  const year = new Date().getFullYear();

  return (
    <div className={styles.footer}>
      Orange IoT 管理平台 &copy; {year} <span aria-hidden="true">·</span> v
      {__APP_VERSION__}
    </div>
  );
};

export default Footer;
