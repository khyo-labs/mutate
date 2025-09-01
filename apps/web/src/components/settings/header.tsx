import { Button } from '../ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer';

type Props = {
	title: string;
	description?: string;
	button?: {
		icon?: React.ElementType;
		label: string;
		dialog?: React.ElementType;
		drawer?: React.ElementType;
		disabled?: boolean;
	};
};

export function SettingsHeader({ title, description, button }: Props) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl">{title}</h1>
				{button?.dialog && (
					<Dialog>
						<DialogTrigger asChild>
							<Button size="sm" disabled={button?.disabled}>
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
							<button.dialog />
						</DialogContent>
					</Dialog>
				)}

				{button?.drawer && (
					<Drawer direction="right">
						<DrawerTrigger asChild>
							<Button size="sm" disabled={button?.disabled}>
								{button?.icon && <button.icon className="size-4" />}
								{button?.label}
							</Button>
						</DrawerTrigger>
						<DrawerContent>
							<DrawerHeader>
								<DrawerTitle>{button?.label}</DrawerTitle>
								<DrawerDescription className="sr-only">
									Drawer for {button?.label}
								</DrawerDescription>
							</DrawerHeader>
							<button.drawer />
						</DrawerContent>
					</Drawer>
				)}
			</div>
			<p className="text-foreground mt-1">{description}</p>
		</div>
	);
}
