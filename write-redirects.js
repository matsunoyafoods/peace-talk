const fs = require('fs');

// Update profile page - redirect to /home instead of /groups
let profile = fs.readFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/profile/page.tsx', 'utf8');
profile = profile.replace(/router\.push\("\/groups"\)/g, 'router.push("/home")');
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/profile/page.tsx', profile);
console.log('Profile updated.');

// Update login page - redirect to /home instead of /profile
let login = fs.readFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/page.tsx', 'utf8');
login = login.replace(/router\.push\("\/profile"\)/g, 'router.push("/home")');
fs.writeFileSync('/Users/matsuzakitsuyoshi/Desktop/kami-chat/src/app/page.tsx', login);
console.log('Login updated.');

console.log('Done! All redirects updated to /home.');
