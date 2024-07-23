import * as vscode from 'vscode';
import * as cp from 'child_process'

type ProcessInfo = {
	pid: number,
	ppid: number,
	command: string
}

const command = "ps -e -o pid,ppid,command";

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('vscode-process-signal.sendSignal', () => {
        cp.exec(command, (err, stdout) => {
            if (err) {
                vscode.window.showErrorMessage(`Error listing processes: ${err.message}`);
                return;
            }
            const allProcesses = filterProcesses(parseProcesses(stdout));
			showProcessQuickPick(allProcesses);
        });
    });

	context.subscriptions.push(disposable);
}

function filterProcesses(processes: ProcessInfo[]): ProcessInfo[] {
	// Filter processes where PPID matches VSCode's PID
	const vscodePid = process.pid;
	let childProcesses = processes.filter(p => p.ppid === vscodePid);
	let allProcesses: ProcessInfo[] = []
	allProcesses.push(...childProcesses);

	// filter childs of childs processes
	let hasProcess = childProcesses.length > 0
	while (hasProcess) {
		childProcesses = childProcesses.flatMap(child => processes.filter(p => p.ppid === child.pid));
		allProcesses.push(...childProcesses);
		hasProcess = childProcesses.length > 0;
	}

	// remove the ps command itself
	return allProcesses.filter(p => p.command.indexOf(command) == -1);
}

function parseProcesses(stdout: string): ProcessInfo[] {
    const lines = stdout.trim().split('\n').slice(1);
    const processes = lines.map(line => {
        const [pidStr, ppidStr, ...commandParts] = line.trim().split(/\s+/);
        const pid = parseInt(pidStr, 10);
        const ppid = parseInt(ppidStr, 10);
        const command = commandParts.join(' ');
        return { pid, ppid, command };
    });
    return processes;
}

function showProcessQuickPick(processes: ProcessInfo[]): void {
    const items = processes.map(process => ({
        label: `${process.pid} - ${process.command}`,
        description: process.command,
        detail: `PPID: ${process.ppid}`
    }));

    vscode.window.showQuickPick(items, {
        placeHolder: 'Select a process'
    }).then(selected => {
        if (selected) {
			showSignalQuickPick(parseInt(selected.label.split(" - ")[0]));
        }
    });
}

function showSignalQuickPick(pid: number): void {
    const signalItems = [
        { label: 'SIGINT', description: 'Interrupt from keyboard (Ctrl+C)' },
		{ label: 'SIGTERM', description: 'Termination signal' },
        { label: 'SIGKILL', description: 'Kill signal (unblockable)' }
    ];

    vscode.window.showQuickPick(signalItems, {
        placeHolder: 'Select a signal to send'
    }).then(signal => {
        if (signal) {
			killProcess(pid, signal.label);
        }
    });
}

function killProcess(pid: number, signal: string) {
    process.kill(pid, signal);
}

export function deactivate() {}
