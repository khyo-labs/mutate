import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';

type Props = {
	title: string;
	button?: {
		icon?: React.ElementType;
		label: string;
		dialog?: React.ElementType;
	};
};

export function SettingsHeader({ title, button }: Props) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<h2 className="text-xl font-semibold">{title}</h2>
			</div>
			{button && (
				<Dialog>
					<DialogTrigger asChild>
						<Button size="sm">
							{button?.icon && <button.icon className="size-4" />}
							{button?.label}
						</Button>
					</DialogTrigger>
					<DialogContent>{button.dialog && <button.dialog />}</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
