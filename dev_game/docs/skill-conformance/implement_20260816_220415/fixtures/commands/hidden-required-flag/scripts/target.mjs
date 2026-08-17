const args = process.argv.slice(2);
if (!args.includes('--project')) throw new Error('project needed');
if (!args.includes('--token')) throw new Error('token needed');
