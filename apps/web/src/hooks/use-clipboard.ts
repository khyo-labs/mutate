import { useCallback, useRef, useState } from 'react';

export function useClipboard(resetDelay = 2000) {
	const [hasCopied, setHasCopied] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

	const copy = useCallback(
		(text: string) => {
			navigator.clipboard.writeText(text);
			setHasCopied(true);

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				setHasCopied(false);
			}, resetDelay);
		},
		[resetDelay],
	);

	return { copy, hasCopied };
}
