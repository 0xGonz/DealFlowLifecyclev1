import { spawn } from 'child_process';

// Spawn the drizzle-kit push command
const child = spawn('npx', ['drizzle-kit', 'push']);

// When the process outputs text to stdout
child.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // If the process is asking for confirmation, automatically respond with 'y'
  if (output.includes('Do you still want to push changes?')) {
    child.stdin.write('y\n');
  }
});

// When the process outputs text to stderr
child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

// When the process exits
child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
