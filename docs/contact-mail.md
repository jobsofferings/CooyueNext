# 网站留言邮件发送

`server/src/modules/contact/mailer.js` 按顺序发送网站留言：

1. 优先使用 QQ 邮箱。
2. QQ 连接、认证或发送失败时，自动使用原来的 Gmail SMTP 配置重试。
3. 任一邮箱发送成功就停止，不会再用另一个邮箱重复发送。
4. 只有全部已配置的发送通道失败，接口才返回发送失败；缺少完整配置的通道会被跳过。

## 配置

在本地 `server/.env` 中增加 QQ 配置，保留原来的 `CONTACT_SMTP_*` Gmail 配置不变。
授权码和应用密码只能存入该 Git 忽略文件，不能提交到仓库。

| 环境变量 | 用途 / 默认值 |
| --- | --- |
| `CONTACT_QQ_SMTP_USER` | QQ 邮箱完整地址，必填 |
| `CONTACT_QQ_SMTP_PASS` | QQ 邮箱 SMTP 授权码，必填，不是登录密码 |
| `CONTACT_QQ_SMTP_HOST` | SMTP 主机；QQ 地址默认推断为 `smtp.qq.com` |
| `CONTACT_QQ_SMTP_PORT` | 端口，默认 `465` |
| `CONTACT_QQ_SMTP_SECURE` | 是否使用隐式 TLS；端口 `465` 时默认开启 |
| `CONTACT_QQ_SMTP_REQUIRE_TLS` | 是否强制 STARTTLS；端口 `587` 且未使用隐式 TLS 时默认开启 |

原 `CONTACT_SMTP_HOST`、`CONTACT_SMTP_PORT`、`CONTACT_SMTP_USER`、`CONTACT_SMTP_PASS`、
`CONTACT_SMTP_SECURE` 和 `CONTACT_SMTP_REQUIRE_TLS` 继续用于 Gmail 备用发送。
未配置 QQ 时，仍保持原来的 Gmail 单通道行为。

两个通道共用 `CONTACT_SMTP_CONNECTION_TIMEOUT_MS`、`CONTACT_SMTP_GREETING_TIMEOUT_MS`、
`CONTACT_SMTP_SOCKET_TIMEOUT_MS`，默认分别为 15000、15000、30000 毫秒。

`CONTACT_RECIPIENT_EMAIL` 仍控制收件人，不会因为切换发送邮箱而改变。
发件人地址随实际使用的通道切换；发件人名称、主题、正文和访客的回复地址保持一致。
QQ 失败切换时，服务日志只记录 SMTP 主机和错误码，不记录授权码。

修改环境变量后，需要重新创建后端容器使配置生效，项目部署脚本会处理代码构建和容器更新。

## 验证

运行 `cd server && npm run test:contact`。
测试使用模拟 SMTP 传输，不向真实邮箱发送邮件。
覆盖 QQ 优先、QQ 失败后 Gmail 接管、全部失败、单通道配置和超时设置等场景。
