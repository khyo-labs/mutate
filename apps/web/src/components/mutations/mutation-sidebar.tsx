import { Link } from '@tanstack/react-router';
import { Check, Code, Copy, Key } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClipboard } from '@/hooks/use-clipboard';
import type { Configuration } from '@/types';

type MutationSidebarProps = {
	config: Configuration;
	showConfig?: boolean;
};

function CopyButton({ text }: { text: string }) {
	const { copy, hasCopied } = useClipboard();

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={() => copy(text)}
			className="h-7 gap-1.5 px-2 text-xs"
		>
			{hasCopied ? (
				<>
					<Check className="h-3 w-3" />
					Copied
				</>
			) : (
				<>
					<Copy className="h-3 w-3" />
					Copy
				</>
			)}
		</Button>
	);
}

function CodeBlock({ code, label }: { code: string; label: string }) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-muted-foreground text-xs font-medium">{label}</span>
				<CopyButton text={code} />
			</div>
			<ScrollArea className="w-full">
				<pre className="bg-muted/50 rounded-lg p-4 font-mono text-xs">{code}</pre>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</div>
	);
}

export function MutationSidebar({ config, showConfig = false }: MutationSidebarProps) {
	const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

	const curlExample = `curl -X POST ${apiBaseUrl}/v1/mutate/${config.id} \\
  -H "Content-Type: multipart/form-data" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@your-file.xlsx"`;

	const jsExample = `const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('${apiBaseUrl}/v1/mutate/${config.id}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
});

const result = await response.json();`;

	const pythonExample = `import requests

files = {'file': open('your-file.xlsx', 'rb')}
headers = {'Authorization': 'Bearer YOUR_API_KEY'}

response = requests.post(
    '${apiBaseUrl}/v1/mutate/${config.id}',
    files=files,
    headers=headers
)

result = response.json()`;

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

	return (
		<Card>
			<CardHeader>
				<CardTitle>API Integration</CardTitle>
				<CardDescription>Use these snippets to call this mutation via API</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="bg-primary/5 flex items-start gap-3 rounded-lg p-3">
					<Key className="text-primary mt-0.5 h-4 w-4 shrink-0" />
					<div className="min-w-0 flex-1">
						<p className="text-foreground text-sm font-medium">API Key Required</p>
						<p className="text-muted-foreground mt-0.5 text-xs">
							You need an API key to authenticate requests.
						</p>
						<Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
							<Link to="/settings">Manage API Keys</Link>
						</Button>
					</div>
				</div>

				<Tabs defaultValue="curl">
					<TabsList className="w-full">
						<TabsTrigger value="curl">cURL</TabsTrigger>
						<TabsTrigger value="js">JavaScript</TabsTrigger>
						<TabsTrigger value="python">Python</TabsTrigger>
					</TabsList>
					<TabsContent value="curl">
						<CodeBlock code={curlExample} label="Terminal" />
					</TabsContent>
					<TabsContent value="js">
						<CodeBlock code={jsExample} label="fetch" />
					</TabsContent>
					<TabsContent value="python">
						<CodeBlock code={pythonExample} label="requests" />
					</TabsContent>
				</Tabs>

				{showConfig && (
					<>
						<Separator />
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Code className="text-primary h-4 w-4" />
									<span className="text-sm font-medium">Configuration</span>
								</div>
								<CopyButton text={configJson} />
							</div>
							<ScrollArea className="w-full">
								<pre className="bg-muted/50 max-h-64 overflow-y-auto rounded-lg p-4 font-mono text-xs">
									{configJson}
								</pre>
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
