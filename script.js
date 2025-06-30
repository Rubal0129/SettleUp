let currentUser = {};
    let currentGroupID = "";
    let groups = {};

    window.onload = () => {
      const storedGroups = localStorage.getItem("settleUpGroups");
      if (storedGroups) groups = JSON.parse(storedGroups);

      const urlParams = new URLSearchParams(window.location.search);
      const groupParam = urlParams.get('group');
      if (groupParam && groups[groupParam]) {
        currentGroupID = groupParam;
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');
        document.getElementById('group-id-label').textContent = currentGroupID;
        updateExpenseList();
        updateBalances();
        updateMembers();
      }
    };

    function saveGroups() {
      localStorage.setItem("settleUpGroups", JSON.stringify(groups));
    }

    function handleLogin(event) {
      event.preventDefault();
      const name = document.getElementById('user-name').value.trim();
      const mobile = document.getElementById('user-mobile').value.trim();
      if (name && /^[0-9]{10}$/.test(mobile)) {
        currentUser = { name, mobile };
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('group-selection').classList.remove('hidden');
        showPastGroups();
      } else {
        alert("Enter valid name and 10-digit mobile number.");
      }
      return false;
    }

    function showCreateGroup() {
      document.getElementById('create-group-form').classList.remove('hidden');
    }

    function createNewGroup(event) {
      event.preventDefault();
      const groupId = document.getElementById('new-group-id').value.trim();
      if (!groupId || groups[groupId]) {
        alert("Group already exists or is invalid.");
        return false;
      }
      groups[groupId] = { admin: currentUser, members: [currentUser], expenses: [] };
      currentGroupID = groupId;
      saveGroups();
      startApp();
      return false;
    }

    function joinPastGroup(groupId) {
      const group = groups[groupId];
      if (!group.members.find(m => m.name === currentUser.name && m.mobile === currentUser.mobile)) {
        group.members.push(currentUser);
      }
      currentGroupID = groupId;
      saveGroups();
      startApp();
    }

    function showPastGroups() {
      const list = document.getElementById('past-group-list');
      list.innerHTML = "";
      let hasGroups = false;
      for (const [groupId, group] of Object.entries(groups)) {
        if (group.members.some(m => m.name === currentUser.name && m.mobile === currentUser.mobile)) {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.textContent = groupId;
          btn.onclick = () => joinPastGroup(groupId);
          btn.className = "group-btn";
          li.appendChild(btn);
          list.appendChild(li);
          hasGroups = true;
        }
      }
      document.getElementById('past-groups').classList.toggle('hidden', !hasGroups);
    }

    function startApp() {
      document.getElementById('group-selection').classList.add('hidden');
      document.getElementById('app-section').classList.remove('hidden');
      document.getElementById('group-id-label').textContent = currentGroupID;
      updateExpenseList();
      updateBalances();
      updateMembers();
    }

    function handleExpense(event) {
      event.preventDefault();
      const desc = document.getElementById('desc').value.trim();
      const amount = parseFloat(document.getElementById('amount').value);
      const category = document.getElementById('category').value;
      const payer = document.getElementById('payer').value.trim();
      const group = groups[currentGroupID];
      if (!desc || !amount || !category || !payer) {
        alert("All fields are required.");
        return false;
      }
      if (!group.members.find(m => m.name === payer)) {
        alert("Payer must be a group member.");
        return false;
      }
      group.expenses.push({ desc, amount, category, payer });
      saveGroups();
      document.getElementById('expense-form').reset();
      updateExpenseList();
      updateBalances();
      return false;
    }

    function updateExpenseList() {
      const list = document.getElementById('expense-list');
      list.innerHTML = "";
      const expenses = groups[currentGroupID]?.expenses || [];
      expenses.forEach(e => {
        const li = document.createElement('li');
        li.textContent = `${e.payer} paid ₹${e.amount} for ${e.desc} (${e.category})`;
        list.appendChild(li);
      });
    }

    function updateBalances() {
      const group = groups[currentGroupID];
      const balances = {};
      const members = group.members.map(m => m.name);
      members.forEach(name => balances[name] = 0);
      group.expenses.forEach(e => {
        const split = e.amount / members.length;
        members.forEach(member => {
          if (member === e.payer) balances[member] += e.amount - split;
          else balances[member] -= split;
        });
      });
      const list = document.getElementById('balance-list');
      list.innerHTML = "";
      members.forEach(name => {
        const amt = balances[name].toFixed(2);
        const li = document.createElement('li');
        li.textContent = amt > 0
          ? `${name} should receive ₹${amt}`
          : amt < 0
            ? `${name} owes ₹${Math.abs(amt)}`
            : `${name} is settled up`;
        list.appendChild(li);
      });
    }

    function updateMembers() {
      const group = groups[currentGroupID];
      const memberList = document.getElementById('group-members');
      memberList.innerHTML = "";
      group.members.forEach((m, index) => {
        const li = document.createElement('li');
        li.textContent = `${m.name} (${m.mobile})`;
        if (group.admin.name === currentUser.name && group.admin.mobile === currentUser.mobile &&
            !(m.name === currentUser.name && m.mobile === currentUser.mobile)) {
          const removeBtn = document.createElement('button');
          removeBtn.className = "remove-btn";
          removeBtn.textContent = "❌ Remove";
          removeBtn.onclick = () => {
            if (confirm(`Remove ${m.name} from group?`)) {
              group.members.splice(index, 1);
              saveGroups();
              updateMembers();
              updateBalances();
            }
          };
          li.appendChild(removeBtn);
        }
        memberList.appendChild(li);
      });
    }

    function renameGroup() {
      const newId = prompt("Enter a new Group ID:");
      if (!newId || groups[newId]) {
        alert("Invalid or existing ID.");
        return;
      }
      groups[newId] = { ...groups[currentGroupID] };
      delete groups[currentGroupID];
      currentGroupID = newId;
      saveGroups();
      alert("Renamed successfully.");
      document.getElementById('group-id-label').textContent = newId;
    }

    function deleteGroup() {
      if (!confirm("Are you sure you want to delete this group?")) return;
      delete groups[currentGroupID];
      saveGroups();
      alert("Group deleted.");
      backToGroupSelection();
    }

    function copyInviteLink() {
      const url = `${window.location.origin}${window.location.pathname}?group=${encodeURIComponent(currentGroupID)}`;
      navigator.clipboard.writeText(url).then(() => {
        alert("Invite link copied!");
      }).catch(() => {
        alert("Failed to copy link.");
      });
    }

    function backToLogin() {
      document.getElementById('group-selection').classList.add('hidden');
      document.getElementById('login-section').classList.remove('hidden');
    }

    function backToGroupSelection() {
      document.getElementById('app-section').classList.add('hidden');
      document.getElementById('group-selection').classList.remove('hidden');
      showPastGroups();
    }