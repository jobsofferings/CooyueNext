'use client'

interface TestimonialCardProps {
  name: string
  role: string
  content: string
  image: string
}

export default function TestimonialCard({ name, role, content, image }: TestimonialCardProps) {
  return (
    <div className="testimonial-two__single">
      <div className="testimonial-two__shape-1">
        <img src="/assets/images/shapes/testimonial-two-shape-1.png" alt="" />
      </div>
      <div className="testimonial-two__shape-2">
        <img src="/assets/images/shapes/testimonial-two-shape-2.png" alt="" />
      </div>
      <div className="testimonial-two__shape-3">
        <img src="/assets/images/shapes/testimonial-two-shape-3.png" alt="" />
      </div>
      <div className="testimonial-two__shape-4">
        <img src="/assets/images/shapes/testimonial-two-shape-4.png" alt="" />
      </div>
      <div className="testimonial-two__client-img-and-info">
        <div className="testimonial-two__client-img">
          <img src={image} alt={name} />
        </div>
        <div className="testimonial-two__client-info">
          <h3>{name}</h3>
          <p>{role}</p>
        </div>
      </div>
      <p className="testimonial-two__text">{content}</p>
    </div>
  )
}
