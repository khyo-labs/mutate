import { Button } from '../ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';

type Props = {
	title: string;
	description?: string;
	button?: {
		icon?: React.ElementType;
		label: string;
		dialog?: React.ElementType;
	};
};

export function SettingsHeader({ title, description, button }: Props) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl">{title}</h1>
				{button && (
					<Dialog>
						<DialogTrigger asChild>
							<Button size="sm">
								{button?.icon && <button.icon className="size-4" />}
								{button?.label}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{button?.label}</DialogTitle>
								<DialogDescription className="sr-only">
									Dialog for {button?.label}
								</DialogDescription>
							</DialogHeader>
							{button.dialog && <button.dialog />}
						</DialogContent>
					</Dialog>
				)}
			</div>
			<p className="text-foreground mt-1">{description}</p>
		</div>
	);
}
