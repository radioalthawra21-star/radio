const { execSync } = require('child_process');
const path = require('path');
const f = path.join('E:\\موقع راديو الثورة\\1‏‏dd -copy with money & NEWS\\frontend', 'node_modules', '.bin', 'esbuild.cmd');
const target = path.join('E:\\موقع راديو الثورة\\1‏‏dd -copy with money & NEWS\\frontend', 'src', 'pages', 'Admin', 'AdminDashboard.jsx');
try {
  const out = execSync(`"${f}" "${target}" --loader=jsx --bundle --external:react --external:react-dom --external:react-router-dom --format=esm --outfile="C:\\Users\\C-1~1\\AppData\\Local\\Temp\\opencode\\admin_check.js"`, { encoding: 'utf8', stdio: 'pipe' });
  console.log('OK: esbuild parsed successfully');
  console.log(out.slice(0, 500));
} catch (e) {
  console.error('BUILD ERROR:');
  console.error(e.stdout);
  console.error(e.stderr);
}