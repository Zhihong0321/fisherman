// RSVP functionality
document.addEventListener('DOMContentLoaded', () => {
  // Load initial RSVPs
  loadRsvps();

  // RSVP button click
  const rsvpButton = document.getElementById('rsvpButton');
  const modal = document.getElementById('rsvpModal');
  const closeBtn = document.querySelector('.close');
  const rsvpForm = document.getElementById('rsvpForm');

  rsvpButton.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Close modal if clicked outside
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Form submit
  rsvpForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();
    if (!name) {
      alert('请输入姓名');
      return;
    }
    fetch('/api/rsvps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('确认出席！');
        nameInput.value = '';
        modal.style.display = 'none';
        loadRsvps(); // Refresh list
      } else {
        alert('提交失败：' + (data.error || '未知错误'));
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('提交失败，请稍后重试');
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