import {
	ArrowRight,
	BarChart3,
	Check,
	Download,
	FileText,
	Menu,
	Shield,
	Users,
	X,
	Zap,
} from 'lucide-react';
import { useState } from 'react';

function App() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<div className="min-h-screen bg-white">
			{/* Navigation */}
			<nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between">
						<div className="flex items-center">
							<div className="shrink-0">
								<h1 className="text-2xl font-bold text-gray-900">mutate</h1>
							</div>
						</div>

						<div className="hidden md:block">
							<div className="ml-10 flex items-baseline space-x-4">
								<a
									href="#features"
									className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
								>
									Features
								</a>
								<a
									href="#pricing"
									className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
								>
									Pricing
								</a>
								<a
									href="#about"
									className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
								>
									About
								</a>
								<a
									href="https://app.usemutate.com"
									className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
								>
									Get Started
								</a>
							</div>
						</div>

						<div className="md:hidden">
							<button
								onClick={() => setIsMenuOpen(!isMenuOpen)}
								className="text-gray-600 hover:text-gray-900"
							>
								{isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
							</button>
						</div>
					</div>
				</div>

				{/* Mobile menu */}
				{isMenuOpen && (
					<div className="md:hidden">
						<div className="space-y-1 border-t border-gray-200 bg-white px-2 pt-2 pb-3 sm:px-3">
							<a
								href="#features"
								className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
							>
								Features
							</a>
							<a
								href="#pricing"
								className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
							>
								Pricing
							</a>
							<a
								href="#about"
								className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
							>
								About
							</a>
							<a
								href="https://app.usemutate.com"
								className="block rounded-md bg-blue-600 px-3 py-2 text-base font-medium text-white hover:bg-blue-700"
							>
								Get Started
							</a>
						</div>
					</div>
				)}
			</nav>

			{/* Hero Section */}
			<section className="relative bg-white">
				<div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
					<div className="text-center">
						<h1 className="text-4xl leading-tight font-bold text-gray-900 sm:text-6xl">
							Transform Your
							<span className="text-blue-600"> Data</span>
							<br />
							Visually & Effortlessly
						</h1>
						<p className="mx-auto mt-6 max-w-3xl text-xl text-gray-600">
							Create visual, reusable configurations for transforming XLSX files to CSV format.
							Design transformation rules through a drag-and-drop interface, test with previews, and
							execute via API or web interface.
						</p>
						<div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
							<a
								href="https://app.usemutate.com"
								className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
							>
								Start Transforming
								<ArrowRight className="ml-2 h-5 w-5" />
							</a>
							<a
								href="#features"
								className="rounded-lg bg-gray-100 px-8 py-4 text-lg font-semibold text-gray-900 transition-colors hover:bg-gray-200"
							>
								Learn More
							</a>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section id="features" className="bg-gray-50 py-24">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="text-center">
						<h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
							Powerful Features for Data Transformation
						</h2>
						<p className="mt-4 text-xl text-gray-600">
							Everything you need to transform your spreadsheets efficiently
						</p>
					</div>

					<div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						<div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
								<Zap className="h-6 w-6 text-blue-600" />
							</div>
							<h3 className="mb-4 text-xl font-semibold text-gray-900">Visual Rule Builder</h3>
							<p className="text-gray-600">
								Create transformation rules with our intuitive drag-and-drop interface. No coding
								required - just drag, drop, and configure.
							</p>
						</div>

						<div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
								<FileText className="h-6 w-6 text-green-600" />
							</div>
							<h3 className="mb-4 text-xl font-semibold text-gray-900">Live Preview</h3>
							<p className="text-gray-600">
								Test your transformations in real-time with live previews. See exactly how your data
								will be transformed before processing.
							</p>
						</div>

						<div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
								<Shield className="h-6 w-6 text-purple-600" />
							</div>
							<h3 className="mb-4 text-xl font-semibold text-gray-900">Multi-tenant Security</h3>
							<p className="text-gray-600">
								Enterprise-grade security with complete data isolation between organizations. Your
								data stays private and secure.
							</p>
						</div>

						<div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
								<Download className="h-6 w-6 text-orange-600" />
							</div>
							<h3 className="mb-4 text-xl font-semibold text-gray-900">API & Web Interface</h3>
							<p className="text-gray-600">
								Process files through our web interface or integrate with your systems using our
								powerful REST API.
							</p>
						</div>

						<div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
								<BarChart3 className="h-6 w-6 text-red-600" />
							</div>
							<h3 className="mb-4 text-xl font-semibold text-gray-900">Advanced Rules</h3>
							<p className="text-gray-600">
								Support for complex transformations including cell merging, formula evaluation,
								column validation, and worksheet combining.
							</p>
						</div>

						<div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
							<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100">
								<Users className="h-6 w-6 text-teal-600" />
							</div>
							<h3 className="mb-4 text-xl font-semibold text-gray-900">Team Collaboration</h3>
							<p className="text-gray-600">
								Share configurations across your organization with role-based access control and
								collaborative editing.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Pricing Section */}
			<section id="pricing" className="bg-white py-24">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="text-center">
						<h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
							Simple, Transparent Pricing
						</h2>
						<p className="mt-4 text-xl text-gray-600">
							Choose the plan that works best for your team
						</p>
					</div>

					<div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
						{/* Starter Plan */}
						<div className="rounded-xl border border-gray-200 bg-white p-8">
							<h3 className="text-2xl font-bold text-gray-900">Starter</h3>
							<p className="mt-4 text-gray-600">Perfect for individuals and small projects</p>
							<div className="mt-8">
								<span className="text-4xl font-bold text-gray-900">$9</span>
								<span className="text-gray-600">/month</span>
							</div>
							<ul className="mt-8 space-y-4">
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Up to 100 transformations/month</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">5 saved configurations</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Web interface access</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Email support</span>
								</li>
							</ul>
							<button className="mt-8 w-full rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800">
								Get Started
							</button>
						</div>

						{/* Professional Plan */}
						<div className="relative rounded-xl border-2 border-blue-200 bg-blue-50 p-8">
							<div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
								<span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
									Most Popular
								</span>
							</div>
							<h3 className="text-2xl font-bold text-gray-900">Professional</h3>
							<p className="mt-4 text-gray-600">Ideal for growing teams and businesses</p>
							<div className="mt-8">
								<span className="text-4xl font-bold text-gray-900">$29</span>
								<span className="text-gray-600">/month</span>
							</div>
							<ul className="mt-8 space-y-4">
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Up to 1,000 transformations/month</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Unlimited configurations</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">API access</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Team collaboration</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Priority support</span>
								</li>
							</ul>
							<button className="mt-8 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
								Get Started
							</button>
						</div>

						{/* Enterprise Plan */}
						<div className="rounded-xl border border-gray-200 bg-white p-8">
							<h3 className="text-2xl font-bold text-gray-900">Enterprise</h3>
							<p className="mt-4 text-gray-600">For large organizations with custom needs</p>
							<div className="mt-8">
								<span className="text-4xl font-bold text-gray-900">Custom</span>
							</div>
							<ul className="mt-8 space-y-4">
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Unlimited transformations</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Advanced security features</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Custom integrations</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">Dedicated support</span>
								</li>
								<li className="flex items-center">
									<Check className="mr-3 h-5 w-5 text-green-500" />
									<span className="text-gray-600">SLA guarantee</span>
								</li>
							</ul>
							<button className="mt-8 w-full rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800">
								Contact Sales
							</button>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="bg-blue-600 py-16">
				<div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
					<h2 className="text-3xl font-bold text-white sm:text-4xl">
						Ready to Transform Your Data?
					</h2>
					<p className="mt-4 text-xl text-blue-100">
						Join thousands of teams already using Mutate to streamline their data workflows.
					</p>
					<div className="mt-8">
						<a
							href="https://app.usemutate.com"
							className="inline-flex items-center rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-colors hover:bg-gray-100"
						>
							Start Your Free Trial
							<ArrowRight className="ml-2 h-5 w-5" />
						</a>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer id="about" className="bg-gray-900 py-16">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 gap-8 md:grid-cols-4">
						<div className="col-span-1 md:col-span-2">
							<h3 className="text-2xl font-bold text-white">mutate</h3>
							<p className="mt-4 text-gray-400">
								The most intuitive platform for transforming your XLSX data. Built for teams that
								value simplicity, security, and efficiency.
							</p>
						</div>

						<div>
							<h4 className="mb-4 text-lg font-semibold text-white">Product</h4>
							<ul className="space-y-2">
								<li>
									<a href="#features" className="text-gray-400 transition-colors hover:text-white">
										Features
									</a>
								</li>
								<li>
									<a href="#pricing" className="text-gray-400 transition-colors hover:text-white">
										Pricing
									</a>
								</li>
								<li>
									<a
										href="https://app.usemutate.com"
										className="text-gray-400 transition-colors hover:text-white"
									>
										Get Started
									</a>
								</li>
							</ul>
						</div>

						<div>
							<h4 className="mb-4 text-lg font-semibold text-white">Company</h4>
							<ul className="space-y-2">
								<li>
									<a href="#about" className="text-gray-400 transition-colors hover:text-white">
										About
									</a>
								</li>
								<li>
									<a
										href="mailto:support@usemutate.com"
										className="text-gray-400 transition-colors hover:text-white"
									>
										Contact
									</a>
								</li>
								<li>
									<a
										href="mailto:support@usemutate.com"
										className="text-gray-400 transition-colors hover:text-white"
									>
										Support
									</a>
								</li>
							</ul>
						</div>
					</div>

					<div className="mt-12 border-t border-gray-800 pt-8 text-center">
						<p className="text-gray-400">
							mutate by
							<a
								href="https://labs.khyo.com"
								className="mx-1 text-gray-400 transition-colors hover:text-white"
							>
								khyo labs
							</a>
							© 2025
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

export default App;
