// Admin functionality
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const dashboard = document.getElementById('dashboard');
  const createAdminForm = document.getElementById('createAdminForm');
  const rsvpList = document.getElementById('rsvpList');

  // Check login status on load
  fetch('/api/admin/status', { credentials: 'include' })
    .then(response => response.json())
    .then(data => {
      if (data.loggedIn) {
        loginForm.style.display = 'none';
        dashboard.style.display = 'block';
        loadRsvps();
        console.log(`Welcome, ${data.username}`);
      } else {
        loginForm.style.display = 'block';
        dashboard.style.display = 'none';
      }
    })
    .catch(error => {
      console.error('Error checking status:', error);
      alert('加载失败，请刷新重试');
    });

  // Login form submit
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) {
      alert('请输入用户名和密码');
      return;
    }
    fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        loginForm.style.display = 'none';
        dashboard.style.display = 'block';
        loadRsvps();
        alert('登录成功！');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
      } else {
        alert('登录失败：' + (data.error || '未知错误'));
      }
    })
    .catch(error => {
      console.error('Login error:', error);
      alert('登录失败，请稍后重试');
    });
  });

  // Create admin form submit
  createAdminForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const newUsername = document.getElementById('newUsername').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    if (!newUsername || !newPassword) {
      alert('请输入新用户名和密码');
      return;
    }
    fetch('/api/admin/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: newUsername, password: newPassword }),
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('管理员创建成功！');
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
      } else {
        alert('创建失败：' + (data.error || '未知错误'));
      }
    })
    .catch(error => {
      console.error('Create admin error:', error);
      alert('创建失败，请稍后重试');
    });
  });
});

function loadRsvps() {
  fetch('/api/rsvps')
    .then(response => response.json())
    .then(rsvps => {
      const rsvpList = document.getElementById('rsvpList');
      rsvpList.innerHTML = '';
      if (rsvps.length === 0) {
        rsvpList.innerHTML = '<p>暂无出席名单</p>';
        return;
      }
      rsvps.forEach(rsvp => {
        const p = document.createElement('p');
        p.textContent = `${rsvp.name} - ${new Date(rsvp.timestamp).toLocaleString('zh-CN')}`;
        rsvpList.appendChild(p);
      });
    })
    .catch(error => {
      console.error('Error loading RSVPs:', error);
      document.getElementById('rsvpList').innerHTML = '<p>加载名单失败</p>';
    });
}