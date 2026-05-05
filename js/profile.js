// Profile and settings management
// Depends on: state.js, dom.js, helpers.js, storage.js

function toggleProfileDropdown() {
  var isOpen = !profileDropdown.classList.contains("hidden");
  profileDropdown.classList.toggle("hidden");
  userAvatar.classList.toggle("open", !isOpen);
}

function applyProfile() {
  var initial = profile.name.charAt(0).toUpperCase();
  userAvatar.textContent = initial;
  userAvatar.style.background = "linear-gradient(135deg, " + profile.color + ", " + profile.color + "cc)";
  dropdownName.textContent = profile.name;

  var ddAvatar = q(".dropdown-avatar");
  if (ddAvatar) {
    ddAvatar.textContent = initial;
    ddAvatar.style.background = "linear-gradient(135deg, " + profile.color + ", " + profile.color + "cc)";
  }
  var heroUser = q(".hero-user");
  if (heroUser) heroUser.textContent = profile.name;
}

function openEditProfile() {
  profileDropdown.classList.add("hidden");
  userAvatar.classList.remove("open");
  $("profileModalOverlay").classList.remove("hidden");
  $("profileNameInput").value = profile.name;
  $("colorPicker").querySelectorAll(".color-option").forEach(function (c) {
    c.classList.toggle("active", c.dataset.color === profile.color);
  });
}

function saveProfile() {
  var name = $("profileNameInput").value.trim();
  if (!name) {
    showToast("Name can't be empty");
    return;
  }
  var activeColor = $("colorPicker").querySelector(".color-option.active");
  profile.name = name;
  profile.color = activeColor ? activeColor.dataset.color : "#1db954";
  saveStorage("profile", profile);
  applyProfile();
  $("profileModalOverlay").classList.add("hidden");
  showToast("Profile updated!");
}
