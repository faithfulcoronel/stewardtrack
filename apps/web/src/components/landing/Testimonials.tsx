"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Angela Dela Cruz",
    role: "Donor Relations Officer",
    church: "Sacred Heart Church",
    quote: "Sobrang helpful ng StewardTrack para sa youth team namin. Ang bilis i-manage ng funds at mas transparent na ngayon sa lahat.",
    img: "/landing/testimonial-1.png"
  },
  {
    id: 2,
    name: "Chris Macasaquit",
    role: "Church Treasurer",
    church: "St. Michael Parish",
    quote: "StewardTrack has made financial tracking so much easier. I can generate reports in minutes, saving me hours of manual work.",
    img: "/landing/testimonial-2.png"
  },
  {
    id: 3,
    name: "Joseph Ramirez",
    role: "Finance Committee Head",
    church: "Grace Fellowship Church",
    quote: "Madaling gamitin si StewardTrack at ang daming features na very useful! Mas mabilis na ngayon ang workflow namin as a team.",
    img: "/landing/testimonial-3.png"
  },
  {
    id: 4,
    name: "Elena Cruz",
    role: "Church Administrator",
    church: "Holy Trinity Baptist Church",
    quote: "I love how intuitive the platform is. Even our less techy members can use it without confusion. It keeps everyone aligned.",
    img: "/landing/testimonial-4.png"
  },
  {
    id: 5,
    name: "Mark Villanueva",
    role: "Youth Ministry Leader",
    church: "Our Lady of Peace Parish",
    quote: "Thanks to StewardTrack dahil naging maayos ang coordination namin. Lahat ng members ng team nakaka-access ng data nang sabay-sabay.",
    img: "/landing/testimonial-5.png"
  }
];

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
  });
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrent(emblaApi.selectedScrollSnap() + 1);
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    setCount(emblaApi.scrollSnapList().length);
    onSelect();

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  return (
    <section className="py-20 bg-gray-900 text-white overflow-hidden" id="testimonials">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Hear From <span className="text-[#179a65]">StewardTrack Users</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Real stories from church communities making change with StewardTrack
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="px-4 md:px-12 max-w-6xl mx-auto relative"
        >
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex -ml-4 pb-8">
              {testimonials.map((t) => (
                <div key={t.id} className="pl-4 flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%]">
                  <div className="h-full pt-12 pb-4 px-2">
                    <div className="bg-white rounded-2xl p-8 text-gray-800 h-full min-h-[380px] flex flex-col relative hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      {/* Profile Image */}
                      <div className="absolute -top-10 left-8 w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                        <Image src={t.img} alt={t.name} width={80} height={80} className="w-full h-full object-cover" />
                      </div>

                      <div className="mt-10 flex-1">
                        <div className="flex items-center gap-1 mb-4 text-yellow-400">
                          {[1, 2, 3, 4, 5].map(i => (
                            <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          ))}
                        </div>
                        <p className="text-lg italic mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                      </div>

                      <div className="border-t border-gray-100 pt-4 mt-auto">
                        <h4 className="font-bold text-lg">{t.name}</h4>
                        <p className="text-gray-500 text-sm">{t.role}</p>
                        <p className="text-[#179a65] text-sm font-medium mt-1">{t.church}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="hidden md:flex absolute top-1/2 -left-12 -translate-y-1/2 size-8 rounded-full items-center justify-center border-none bg-white/10 hover:bg-[#179a65] text-white disabled:opacity-50"
            aria-label="Previous slide"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="hidden md:flex absolute top-1/2 -right-12 -translate-y-1/2 size-8 rounded-full items-center justify-center border-none bg-white/10 hover:bg-[#179a65] text-white disabled:opacity-50"
            aria-label="Next slide"
          >
            <ArrowRight className="size-4" />
          </button>

          {/* Mobile/Tablet Pagination Dots */}
          <div className="flex justify-center gap-2 mt-4 md:hidden">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${current === index + 1 ? "w-8 bg-[#179a65]" : "w-2 bg-gray-600 hover:bg-gray-500"
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
