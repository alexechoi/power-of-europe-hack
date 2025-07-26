"use client";

import Link from "next/link";
import { useAuthenticationStatus } from "@nhost/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowRight, Check, Globe, Shield, Zap, BarChart3, Database, Code } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section with Gradient Background */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-700" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        
        <div className="relative container mx-auto px-4 py-32 sm:py-40">
          <motion.div 
            className="text-center space-y-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.2
                }
              }
            }}
          >
            <motion.div className="space-y-4" variants={fadeIn}>
              <Badge className="px-4 py-2 text-sm mb-4 bg-white/20 backdrop-blur-sm text-white border-none">
                🇪🇺 Built for European Digital Sovereignty
              </Badge>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white">
                <span className="inline-block">Power of</span>{" "}
                <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500">
                  Europe
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light">
                Discover European tech alternatives for your projects. Build with privacy-focused, 
                GDPR-compliant European technologies.
              </p>
            </motion.div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              variants={fadeIn}
            >
              {!isLoading &&
                (isAuthenticated ? (
                  <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-white/90 px-8 h-14 text-lg rounded-full">
                    <Link href="/dashboard">
                      Open Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-white/90 px-8 h-14 text-lg rounded-full">
                      <Link href="/auth">
                        Get Started <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="border-white hover:bg-white/10 px-8 h-14 text-lg rounded-full">
                      <Link href="/extension" target="_blank" rel="noopener noreferrer">
                        Install Extension <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </>
                ))}
            </motion.div>
            
            <motion.div 
              className="pt-12"
              variants={fadeIn}
            >
              <div className="relative mx-auto max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-sm">
                <div className="absolute top-4 left-4 flex space-x-2 z-20">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 pt-12">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">European Tech Finder</h3>
                      <p className="text-gray-400 text-sm">Discover privacy-focused alternatives</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center text-white font-bold">G</div>
                        <span className="text-white">Google Analytics</span>
                      </div>
                      <Badge className="bg-amber-600 text-white hover:bg-amber-700">US-based</Badge>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4 mb-2">
                      <div className="text-sm text-gray-300 mb-3">European Alternatives:</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">P</div>
                            <span className="text-white">Plausible Analytics</span>
                          </div>
                          <Badge className="bg-green-600 text-white hover:bg-green-700">EU-based</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-600 rounded-md flex items-center justify-center text-white font-bold">M</div>
                            <span className="text-white">Matomo</span>
                          </div>
                          <Badge className="bg-green-600 text-white hover:bg-green-700">EU-based</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      View All Alternatives
                    </Button>
                  </div>
                  
                  <div className="text-gray-400 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>GDPR Compliant</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>No Cookie Consent Required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Data Hosted in Europe</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { value: "500+", label: "European Tech Solutions" },
              { value: "27", label: "EU Member States Covered" },
              { value: "100%", label: "GDPR Compliant" },
              { value: "50K+", label: "Active Users" },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center space-y-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="px-4 py-1.5 text-sm mb-2">Core Features</Badge>
            <h2 className="text-4xl font-bold tracking-tight">
              European Tech Sovereignty
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Build your digital products with confidence using European technologies that respect privacy and data sovereignty.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto pt-4">
              {[
                "GDPR Compliant",
                "Privacy-First",
                "Data Sovereignty",
                "European Hosting",
                "Open Source",
                "Ethical AI",
                "Sustainable Tech",
              ].map((tech) => (
                <Badge key={tech} variant="secondary" className="px-3 py-1.5 text-sm">
                  {tech}
                </Badge>
              ))}
            </div>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Globe className="h-6 w-6" />,
                title: "Chrome Extension",
                description: "Our browser extension automatically suggests European alternatives when you browse non-European tech services and APIs.",
                color: "from-blue-500 to-cyan-400"
              },
              {
                icon: <Database className="h-6 w-6" />,
                title: "Tech Database",
                description: "Access our comprehensive database of European tech alternatives across categories like cloud services, AI, analytics, and more.",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: "Compliance Checker",
                description: "Analyze your tech stack for GDPR compliance and data sovereignty issues, with actionable recommendations for European alternatives.",
                color: "from-amber-500 to-orange-500"
              },
            ].map((feature, i) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="h-full border-none bg-card hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 text-white`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="group">
                      Learn more <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-accent/5">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center space-y-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="px-4 py-1.5 text-sm mb-2">How It Works</Badge>
            <h2 className="text-4xl font-bold tracking-tight">
              Simple. Powerful. European.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our tools integrate seamlessly into your workflow to help you discover and implement European tech alternatives.
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-xl border border-border">
                  <div className="bg-card p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-semibold">Tech Stack Analysis</h3>
                      <Badge>European Score: 78%</Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-background">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Cloud Infrastructure</span>
                          <span className="text-amber-500">Mixed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                          <span className="text-sm">65%</span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Recommendation: Replace AWS with OVHcloud or Scaleway
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-background">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Analytics</span>
                          <span className="text-green-500">European</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                          </div>
                          <span className="text-sm">100%</span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Using: Matomo (France)
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-background">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Email Service</span>
                          <span className="text-red-500">Non-European</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '0%' }}></div>
                          </div>
                          <span className="text-sm">0%</span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Recommendation: Replace Mailchimp with Mailjet or SendinBlue
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-6">
                      View Full Analysis
                    </Button>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h3 className="text-3xl font-bold mb-6">Find European Alternatives</h3>
                <div className="space-y-6">
                  {[
                    "Install our Chrome extension to get real-time suggestions while browsing",
                    "Search our database for specific European tech solutions by category",
                    "Compare features, pricing, and compliance levels across alternatives",
                    "Get personalized recommendations based on your tech stack needs"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="bg-primary/10 rounded-full p-1 mt-1">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-lg">{item}</p>
                    </div>
                  ))}
                </div>
                <Button className="mt-8" size="lg">
                  Explore Database <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center space-y-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="px-4 py-1.5 text-sm mb-2">Use Cases</Badge>
            <h2 className="text-4xl font-bold tracking-tight">
              Built for European Businesses
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how organizations across Europe are using our tools to achieve digital sovereignty.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Public Sector",
                description: "Government agencies using our tools to ensure compliance with EU data regulations and support European tech ecosystem.",
                color: "from-blue-500 to-cyan-400"
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: "Startups",
                description: "Tech startups building with European infrastructure to ensure scalability while maintaining data sovereignty.",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: <Code className="h-6 w-6" />,
                title: "Enterprise",
                description: "Large corporations migrating from US-based services to European alternatives for compliance and data protection.",
                color: "from-amber-500 to-orange-500"
              },
            ].map((useCase, i) => (
              <motion.div 
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group"
              >
                <Card className="h-full border group-hover:border-primary/50 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${useCase.color} flex items-center justify-center mb-6 text-white`}>
                      {useCase.icon}
                    </div>
                    <CardTitle className="text-2xl">{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {useCase.description}
                    </CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="group">
                      View Case Study <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-700" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        
        <div className="relative container mx-auto px-4">
          <motion.div 
            className="max-w-4xl mx-auto text-center space-y-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold tracking-tight text-white">
              Ready to Build with European Tech?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join thousands of developers and companies building privacy-first, 
              GDPR-compliant applications with European technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90 px-8 h-14 text-lg rounded-full">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
