// Device key management
function generateDeviceKey() {
  return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

function getDeviceKey() {
  let deviceKey = localStorage.getItem('fisherman_device_key');
  if (!deviceKey) {
    deviceKey = generateDeviceKey();
    localStorage.setItem('fisherman_device_key', deviceKey);
  }
  return deviceKey;
}

// RSVP functionality
document.addEventListener('DOMContentLoaded', () => {
  // Initialize device key
  const deviceKey = getDeviceKey();
  console.log('Device key:', deviceKey);
  
  // Load initial RSVPs
  loadRsvps();
  loadPublicRsvps();

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
    const deviceKey = getDeviceKey();
    fetch('/api/rsvps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, deviceKey }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('确认出席！');
        nameInput.value = '';
        modal.style.display = 'none';
        loadRsvps(); // Refresh list
        loadPublicRsvps(); // Refresh public list
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

function loadPublicRsvps() {
  const deviceKey = getDeviceKey();
  fetch('/api/rsvps')
    .then(response => response.json())
    .then(rsvps => {
      const publicRsvpList = document.getElementById('publicRsvpList');
      publicRsvpList.innerHTML = '';
      if (rsvps.length === 0) {
        publicRsvpList.innerHTML = '<p style="text-align: center; color: #999;">暂无出席名单</p>';
        return;
      }
      rsvps.forEach(rsvp => {
        const div = document.createElement('div');
        div.className = 'rsvp-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = rsvp.name;
        nameSpan.className = 'rsvp-name';
        div.appendChild(nameSpan);
        
        // Show edit/delete buttons only for RSVPs created by this device
        if (rsvp.deviceKey === deviceKey) {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'rsvp-actions';
          
          const editBtn = document.createElement('button');
          editBtn.textContent = '编辑';
          editBtn.className = 'edit-btn';
          editBtn.onclick = () => editRsvp(rsvp);
          
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = '删除';
          deleteBtn.className = 'delete-btn';
          deleteBtn.onclick = () => deleteRsvp(rsvp);
          
          actionsDiv.appendChild(editBtn);
          actionsDiv.appendChild(deleteBtn);
          div.appendChild(actionsDiv);
        }
        
        publicRsvpList.appendChild(div);
      });
    })
    .catch(error => {
      console.error('Error loading public RSVPs:', error);
      document.getElementById('publicRsvpList').innerHTML = '<p style="text-align: center; color: #999;">加载名单失败</p>';
    });
}

function editRsvp(rsvp) {
  const newName = prompt('请输入新的姓名:', rsvp.name);
  if (!newName || newName.trim() === '' || newName.trim() === rsvp.name) {
    return;
  }
  
  const deviceKey = getDeviceKey();
  fetch(`/api/rsvps/${rsvp.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName.trim(), deviceKey }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('修改成功！');
      loadPublicRsvps();
      loadRsvps();
    } else {
      alert('修改失败：' + (data.error || '未知错误'));
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('修改失败，请稍后重试');
  });
}

function deleteRsvp(rsvp) {
  if (!confirm(`确定要删除 "${rsvp.name}" 的出席确认吗？`)) {
    return;
  }
  
  const deviceKey = getDeviceKey();
  fetch(`/api/rsvps/${rsvp.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceKey }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('删除成功！');
      loadPublicRsvps();
      loadRsvps();
    } else {
      alert('删除失败：' + (data.error || '未知错误'));
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('删除失败，请稍后重试');
  });
}