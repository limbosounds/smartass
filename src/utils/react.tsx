export const classNames = (
	requiredName: string,
	conditionalClassNames: Record<string, any> = {},
	optionalClassName?: string,
): string => {
	const conditionalRendered = Object.keys(conditionalClassNames)
		.filter(item => !!conditionalClassNames[item])
		.reduce((acc, item) => {
			return acc + " " + item
		}, "")

	return `${requiredName} ${conditionalRendered} ${optionalClassName ?? ""}`
}