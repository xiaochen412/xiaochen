const express = require('express');//用于接口发送接收
const bodyParser = require('body-parser');//用于读入json格式的数据
const mysql = require('mysql2');//用于控制mysql数据库
const path = require('path');

const app = express();

// MySQL 数据库连接配置
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // 替换为你的MySQL用户名
  password: '12345678', // 替换为你的MySQL密码
  database: 'survey_db'//需要提前做好数据库
});

// 连接数据库
db.connect((err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('成功连接到MySQL数据库');
});

// 中间件
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));//定义主页面为public包中的index.html界面
});
app.post('/submit', (req, res) => {//用于计算自定义得分
    const { q1, q2, q3 } = req.body;
    
    //  (3题每题5分，满分15分)
    const totalScore = parseInt(q1) + parseInt(q2) + parseInt(q3);
    const satisfaction = Math.round((totalScore / 15) * 100);
    
    // 确定评语
    let comment;
    if (satisfaction >= 90) {
      comment = "太棒了！您对我们的服务非常满意！";
    } else if (satisfaction >= 70) {
      comment = "感谢您的支持！我们会继续努力！";
    } else if (satisfaction >= 50) {
      comment = "感谢您的反馈！我们会认真改进！";
    } else {
      comment = "很抱歉没能让您满意，我们会加倍努力！";
    }
    
    // 存储到数据库
    const query = 'INSERT INTO responses (q1, q2, q3) VALUES (?, ?, ?)';
    db.execute(query, [q1, q2, q3], (err, results) => {
      if (err) {
        console.error('数据库插入错误:', err);
        return res.status(500).send('提交失败，请重试');
      }
      
      // 重定向到结果页面并传递参数
      res.redirect(`/result.html?score=${satisfaction}&comment=${encodeURIComponent(comment)}&q1=${q1}&q2=${q2}&q3=${q3}`);
    });
  });
  
  // 添加结果页面路由
  app.get('/result.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'result.html'));//定义路由转至public包中的result页面
  });

// 管理员查看所有结果
app.get('/admin', (req, res) => {
  db.query('SELECT * FROM responses ORDER BY submission_date DESC', (err, results) => {
    if (err) {
      console.error('数据库查询错误:', err);
      return res.status(500).send('无法获取数据');
    }
    //html定义管理员页面结构
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>问卷结果管理</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>问卷结果管理</h1>
        <table>
          <tr>
            <th>ID</th>
            <th>问题1</th>
            <th>问题2</th>
            <th>问题3</th>
            <th>总分</th>
            <th>百分比</th>
            <th>提交时间</th>
          </tr>
    `;
    
    results.forEach(row => {
      const total = row.q1 + row.q2 + row.q3;
      const percent = Math.round((total / 15) * 100);
      html += `
        <tr>
          <td>${row.id}</td>
          <td>${row.q1}</td>
          <td>${row.q2}</td>
          <td>${row.q3}</td>
          <td>${total}</td>
          <td>${percent}%</td>
          <td>${row.submission_date}</td>
        </tr>
      `;
    });
    
    html += `
        </table>
        <p><a href="/">返回问卷</a></p>
      </body>
      </html>
    `;
    
    res.send(html);
  });
});

// 启动服务器，运行在3000端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});