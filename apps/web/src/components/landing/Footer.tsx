"use client";

import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-[#071437] text-white pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-12 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-5">
            <Image src="/landing/logo-dark.png" alt="StewardTrack" width={160} height={40} className="h-10 w-auto mb-6" />
            <p className="text-gray-300 leading-relaxed max-w-md mb-8">
              StewardTrack is a church management platform that makes finances, records, and ministry operations simple, secure, and solution-focused.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-green-500 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-green-500 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-green-500 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="font-bold text-lg mb-6">QUICK LINKS</h4>
            <ul className="space-y-4 text-gray-300">
              <li><a href="#overview" className="hover:text-green-400 transition-colors">Discover</a></li>
              <li><a href="#features" className="hover:text-green-400 transition-colors">Features</a></li>
              <li><a href="#testimonials" className="hover:text-green-400 transition-colors">Testimonials</a></li>
              <li><a href="#pricing" className="hover:text-green-400 transition-colors">Pricing</a></li>
              <li><Link href="/signup" className="hover:text-green-400 transition-colors">Try for Free</Link></li>
              <li><Link href="/login" className="hover:text-green-400 transition-colors">Sign In</Link></li>
            </ul>
          </div>

          {/* Contacts */}
          <div className="md:col-span-3">
            <h4 className="font-bold text-lg mb-6">CONTACTS</h4>
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <span>stewardtrack@gmail.com</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <span>0912-345-6789</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <span>0910-111-2131</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>San Fernando, Pampanga</span>
              </li>
            </ul>
          </div>

          {/* Others */}
          <div className="md:col-span-2">
            <h4 className="font-bold text-lg mb-6">OTHERS</h4>
            <ul className="space-y-4 text-gray-300">
              <li><Link href="/privacy" className="hover:text-green-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-green-400 transition-colors">Terms of Service</Link></li>
              <li><a href="#" className="hover:text-green-400 transition-colors">Help & Support</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} StewardTrack. All rights reserved. | Made with love by Cortanatech Solutions, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
