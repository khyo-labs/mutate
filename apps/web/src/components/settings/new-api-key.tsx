import { Check, Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../ui/button';

type Props = {
	apiKey: string;
	onDone: () => void;
};

export function NewApiKey({ apiKey, onDone }: Props) {
	const [copied, setCopied] = useState(false);

	function copyToClipboard() {
		navigator.clipboard.writeText(apiKey);
		setCopied(true);
		toast.success('Copied to clipboard');
	}

	return (
		<div className="space-y-6">
			<div className="bg-muted/30 flex flex-col items-center rounded-lg border p-6">
				<div className="flex items-center gap-3">
					<KeyRound className="size-8" />
					<h2 className="text-2xl font-semibold">New API Key Created</h2>
				</div>
				<p className="text-muted-foreground mt-2 text-center">
					Here is your new API key. For security reasons, we will not show this key again.
				</p>

				<div className="bg-background relative mt-4 flex w-full items-center justify-between rounded-md border p-3">
					<code className="font-mono text-sm">{apiKey}</code>
					<Button
						variant="ghost"
						size="icon"
						className="absolute top-1/2 right-1 -translate-y-1/2"
						onClick={copyToClipboard}
					>
						{copied ? <Check className="text-success size-4" /> : <Copy className="size-4" />}
					</Button>
				</div>
			</div>
			<Button onClick={onDone} disabled={!copied} className="w-full">
				Done
			</Button>
		</div>
	);
}
