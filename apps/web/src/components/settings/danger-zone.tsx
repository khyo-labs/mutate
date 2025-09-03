import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import * as React from 'react';

interface DangerZoneProps {
	title: string;
	description: string;
	children: React.ReactNode;
}

export function DangerZone({
	title,
	description,
	children,
}: DangerZoneProps) {
	return (
		<Card className="border-destructive">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}
