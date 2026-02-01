import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				'focus-visible:ring-ring focus-visible:ring-offset-background border-border bg-muted peer inline-flex h-6 w-[40px] shrink-0 cursor-pointer items-center rounded-sm border p-[2px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
				'dark:data-[state=checked]:border-primary dark:data-[state=checked]:bg-primary dark:border-gray-600',
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					'bg-background pointer-events-none block size-4 rounded-sm shadow-sm ring-0 transition-transform duration-200',
					'data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0',
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
