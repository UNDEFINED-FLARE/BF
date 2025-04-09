import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBSMvHpZ0_VkqWjJ94UMa6vqEhFiqrsIWM",
  authDomain: "rare-5f47e.firebaseapp.com",
  projectId: "rare-5f47e",
  storageBucket: "rare-5f47e.appspot.com",
  messagingSenderId: "811727087812",
  appId: "1:811727087812:web:d362e68abf6c26acf24191",
  measurementId: "G-DE59771G7Q"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

const groupContainer = document.getElementById("group-container");
const categoryIcons = {
  Social: "fa-solid fa-users",
  Academics: "fa-solid fa-book",
  Marketing: "fa-solid fa-chart-line",
  Service: "fa-solid fa-handshake",
  Music: "fa-solid fa-music",
  Newsletter: "fa-solid fa-envelope-open-text"
};


const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", () => {
  fetchGroups();
});

function fetchGroups() {
  
  const groupsRef = ref(database, "groups");
  const searchQuery = searchInput.value.trim().toLowerCase();
  
  onValue(groupsRef, (snapshot) => {
    groupContainer.innerHTML = "";
    snapshot.forEach((childSnapshot) => {
      const group = childSnapshot.val();
      const groupKey = childSnapshot.key;
      const categoryIcon = categoryIcons[group.category] || "";
      // Filter groups based on search query
      if (group.name.toLowerCase().includes(searchQuery)) {
        const groupHTML = `
      <div class="applSchool">
      <div class="imgDiv">
      <img src="${group.imageURL}" alt="" class="img">
      </div>
        <p class="applName">${group.name}</p>
<p class="applAm"><b>Description : </b>${group.description}</p>

                <i class="${categoryIcon} category-icon"></i>
      

        
        


        
      </div>
        `;
        groupContainer.innerHTML += groupHTML;
      }
    });
  });
}
// <a href="test2.html?id=${groupKey}">view</a>



fetchGroups();



// Toggle button functionality
const toggleBtn = document.getElementById('toggle-btn');
const body = document.body;

toggleBtn.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  if (body.classList.contains('dark-mode')) {
    toggleBtn.textContent = 'Toggle Light Mode';
  } else {
    toggleBtn.textContent = 'Toggle Dark Mode';
  }
});

// Add dark mode styles
const style = document.createElement('style');
style.innerHTML = `
      .dark-mode {
        background-color: #333;
        color: #fff;
        display:;
      }
      .dark-mode .applSchool {
        background-color: #444;
        color: #fff;
      }
      .dark-mode .applName {
        color: #fff;
      }
      .dark-mode .applAm {
        color: #ccc;
      }
    `;
document.head.appendChild(style);

alert('')