import { Code, Copy, Key } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Configuration } from '@/types';

interface MutationSidebarProps {
	config: Configuration;
}

export function MutationSidebar({ config }: MutationSidebarProps) {
	const [copiedItem, setCopiedItem] = useState<string | null>(null);

	const handleCopy = (text: string, itemName: string) => {
		navigator.clipboard.writeText(text);
		setCopiedItem(itemName);
		setTimeout(() => setCopiedItem(null), 2000);
	};

	const configJson = JSON.stringify(
		{
			name: config.name,
			description: config.description,
			rules: config.rules,
			outputFormat: config.outputFormat,
		},
		null,
		2,
	);

	const curlExample = `curl -X POST ${window.location.origin}/api/v1/transform \\
  -H "Content-Type: multipart/form-data" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@your-file.xlsx" \\
  -F "configId=${config.id}"`;

	const jsExample = `const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('configId', '${config.id}');

const response = await fetch('/api/v1/transform', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
});

const result = await response.json();`;

	const pythonExample = `import requests

files = {'file': open('your-file.xlsx', 'rb')}
data = {'configId': '${config.id}'}
headers = {'Authorization': 'Bearer YOUR_API_KEY'}

response = requests.post(
    '${window.location.origin}/api/v1/transform',
    files=files,
    data=data,
    headers=headers
)

result = response.json()`;

	return (
		<div className="space-y-6">
			{/* API Key Notice */}
			<div className="bg-card rounded-lg border p-4">
				<div className="mb-3 flex items-center gap-2">
					<Key className="text-primary h-4 w-4" />
					<h3 className="text-card-foreground font-medium">
						API Authentication
					</h3>
				</div>
				<p className="text-muted-foreground mb-3 text-sm">
					You'll need an API key to use the transformation endpoint.
				</p>
				<Button variant="outline" size="sm" className="w-full">
					Manage API Keys
				</Button>
			</div>

			{/* cURL Example */}
			<div className="bg-card rounded-lg border">
				<div className="border-b p-4">
					<div className="flex items-center justify-between">
						<h3 className="text-card-foreground font-medium">cURL</h3>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleCopy(curlExample, 'curl')}
							className="h-8 px-2"
						>
							<Copy className="mr-1 h-3 w-3" />
							{copiedItem === 'curl' ? 'Copied!' : 'Copy'}
						</Button>
					</div>
				</div>
				<div className="p-4">
					<pre className="text-card-foreground bg-muted/50 overflow-x-auto rounded p-3 font-mono text-xs">
						{curlExample}
					</pre>
				</div>
			</div>

			{/* JavaScript Example */}
			<div className="bg-card rounded-lg border">
				<div className="border-b p-4">
					<div className="flex items-center justify-between">
						<h3 className="text-card-foreground font-medium">JavaScript</h3>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleCopy(jsExample, 'js')}
							className="h-8 px-2"
						>
							<Copy className="mr-1 h-3 w-3" />
							{copiedItem === 'js' ? 'Copied!' : 'Copy'}
						</Button>
					</div>
				</div>
				<div className="p-4">
					<pre className="text-card-foreground bg-muted/50 overflow-x-auto rounded p-3 font-mono text-xs">
						{jsExample}
					</pre>
				</div>
			</div>

			{/* Python Example */}
			<div className="bg-card rounded-lg border">
				<div className="border-b p-4">
					<div className="flex items-center justify-between">
						<h3 className="text-card-foreground font-medium">Python</h3>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleCopy(pythonExample, 'python')}
							className="h-8 px-2"
						>
							<Copy className="mr-1 h-3 w-3" />
							{copiedItem === 'python' ? 'Copied!' : 'Copy'}
						</Button>
					</div>
				</div>
				<div className="p-4">
					<pre className="text-card-foreground bg-muted/50 overflow-x-auto rounded p-3 font-mono text-xs">
						{pythonExample}
					</pre>
				</div>
			</div>

			{/* JSON Configuration */}
			<div className="bg-card rounded-lg border">
				<div className="border-b p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Code className="text-primary h-4 w-4" />
							<h3 className="text-card-foreground font-medium">
								Configuration
							</h3>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleCopy(configJson, 'config')}
							className="h-8 px-2"
						>
							<Copy className="mr-1 h-3 w-3" />
							{copiedItem === 'config' ? 'Copied!' : 'Copy'}
						</Button>
					</div>
				</div>
				<div className="p-4">
					<pre className="text-card-foreground bg-muted/50 max-h-64 overflow-x-auto rounded p-3 font-mono text-xs">
						{configJson}
					</pre>
				</div>
			</div>
		</div>
	);
}
