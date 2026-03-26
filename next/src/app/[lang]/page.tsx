import Link from 'next/link'
import { Locale } from '@/i18n-config'
import { Metadata } from 'next'
import { siteConfig } from '@/config/site.config'
import { getDictionary } from '@/get-dictionary'

export default async function Home({
  params: { lang },
}: {
  params: { lang: Locale }
}) {
  const dict = await getDictionary(lang)
  
  return (
    <main>
      <section className="main-slider">
        <div
          className="main-slider__carousel owl-carousel owl-theme thm-owl__carousel"
          data-owl-options='{"loop": true, "items": 1, "navText": ["<span class=\"icon-left-arrow\"></span>","<span class=\"icon-right-arrow\"></span>"], "margin": 0, "dots": false, "nav": true, "animateOut": "slideOutDown", "animateIn": "fadeIn", "active": true, "smartSpeed": 1000, "autoplay": true, "autoplayTimeout": 7000, "autoplayHoverPause": false}'
        >
          <div className="item main-slider__slide-1">
            <div className="main-slider__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/slider-1-1.jpg)' }}></div>
            <div className="main-slider__shadow"></div>
            <div className="main-slider__shape-1 float-bob-y">
              <img src="/assets/images/shapes/main-slider-shape-1.png" alt="" />
            </div>
            <div className="main-slider__shape-2 img-bounce">
              <img src="/assets/images/shapes/main-slider-shape-2.png" alt="" />
            </div>
            <div className="main-slider__shape-3">
              <img src="/assets/images/shapes/main-slider-shape-3.png" alt="" />
            </div>
            <div className="main-slider__shape-4">
              <img src="/assets/images/shapes/main-slider-shape-4.png" alt="" />
            </div>
            <div className="main-slider__shape-5 float-bob-x">
              <img src="/assets/images/shapes/main-slider-shape-5.png" alt="" />
            </div>
            <div className="container">
              <div className="main-slider__content">
                <p className="main-slider__sub-title">{dict('Sustainable Solutions for you')}</p>
                <h2 className="main-slider__title">{dict('Consulting')} <br />{dict('for the business')}</h2>
                <div className="main-slider__btn-box">
                  <Link href={`/${lang}/about`} className="main-slider__btn thm-btn">{dict('Discover More')}</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="item main-slider__slide-2">
            <div className="main-slider__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/slider-1-2.jpg)' }}></div>
            <div className="main-slider__shadow"></div>
            <div className="main-slider__shape-1 float-bob-y">
              <img src="/assets/images/shapes/main-slider-shape-1.png" alt="" />
            </div>
            <div className="main-slider__shape-2 img-bounce">
              <img src="/assets/images/shapes/main-slider-shape-2.png" alt="" />
            </div>
            <div className="main-slider__shape-3">
              <img src="/assets/images/shapes/main-slider-shape-3.png" alt="" />
            </div>
            <div className="main-slider__shape-4">
              <img src="/assets/images/shapes/main-slider-shape-4.png" alt="" />
            </div>
            <div className="main-slider__shape-5 float-bob-x">
              <img src="/assets/images/shapes/main-slider-shape-5.png" alt="" />
            </div>
            <div className="container">
              <div className="main-slider__content">
                <p className="main-slider__sub-title">{dict('Sustainable Solutions for you')}</p>
                <h2 className="main-slider__title">{dict('Consulting')} <br />{dict('for the business')}</h2>
                <div className="main-slider__btn-box">
                  <Link href={`/${lang}/about`} className="main-slider__btn thm-btn">{dict('Discover More')}</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="item main-slider__slide-3">
            <div className="main-slider__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/slider-1-3.jpg)' }}></div>
            <div className="main-slider__shadow"></div>
            <div className="main-slider__shape-1 float-bob-y">
              <img src="/assets/images/shapes/main-slider-shape-1.png" alt="" />
            </div>
            <div className="main-slider__shape-2 img-bounce">
              <img src="/assets/images/shapes/main-slider-shape-2.png" alt="" />
            </div>
            <div className="main-slider__shape-3">
              <img src="/assets/images/shapes/main-slider-shape-3.png" alt="" />
            </div>
            <div className="main-slider__shape-4">
              <img src="/assets/images/shapes/main-slider-shape-4.png" alt="" />
            </div>
            <div className="main-slider__shape-5 float-bob-x">
              <img src="/assets/images/shapes/main-slider-shape-5.png" alt="" />
            </div>
            <div className="container">
              <div className="main-slider__content">
                <p className="main-slider__sub-title">{dict('Sustainable Solutions for you')}</p>
                <h2 className="main-slider__title">{dict('Consulting')} <br />{dict('for the business')}</h2>
                <div className="main-slider__btn-box">
                  <Link href={`/${lang}/about`} className="main-slider__btn thm-btn">{dict('Discover More')}</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-one">
        <div className="container">
          <div className="row">
            <div className="col-xl-6">
              <div className="about-one__left">
                <div className="about-one__img-box wow slideInLeft" data-wow-delay="100ms" data-wow-duration="2500ms">
                  <div className="about-one__img">
                    <img src="/assets/images/resources/about-one-img-1.jpg" alt="" />
                    <div className="about-one__shape-1 float-bob-x">
                      <img src="/assets/images/shapes/about-one-shape-1.png" alt="" />
                    </div>
                    <div className="about-one__shape-2 img-bounce">
                      <img src="/assets/images/shapes/about-one-shape-2.png" alt="" />
                    </div>
                  </div>
                  <div className="about-one__img-2">
                    <img src="/assets/images/resources/about-one-img-2.jpg" alt="" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6">
              <div className="about-one__right">
                <div className="section-title text-left">
                  <div className="section-title__tagline-box">
                    <span className="section-title__tagline">{dict('Welcome to agency')}</span>
                  </div>
                  <h2 className="section-title__title">{dict('Delivering the Best Consulting')} <span>{dict('Experience')}</span></h2>
                </div>
                <p className="about-one__text">{dict('Lorem ipsum dolor sit amet, consectetur notted adipisicing elit sed do eiusmod tempor incididunt ut labore et simply free text dolore magna aliqua lonm andhn.')}</p>
                <div className="about-one__points-and-experience">
                  <div className="about-one__points-box">
                    <ul className="about-one__points-list list-unstyled">
                      <li>
                        <div className="icon"><span className="fa fa-check"></span></div>
                        <div className="text"><p>{dict('Strategy & Consulting')}</p></div>
                      </li>
                      <li>
                        <div className="icon"><span className="fa fa-check"></span></div>
                        <div className="text"><p>{dict('Business Process')}</p></div>
                      </li>
                    </ul>
                    <ul className="about-one__points-list list-unstyled">
                      <li>
                        <div className="icon"><span className="fa fa-check"></span></div>
                        <div className="text"><p>{dict('Marketing Rules')}</p></div>
                      </li>
                      <li>
                        <div className="icon"><span className="fa fa-check"></span></div>
                        <div className="text"><p>{dict('Partnerships')}</p></div>
                      </li>
                    </ul>
                  </div>
                  <div className="about-one__experience-box">
                    <div className="about-one__experience-icon">
                      <span className="icon-certificate"></span>
                    </div>
                    <div className="about-one__experience-text">
                      <p>{dict('10 Years of Consulting Experience')}</p>
                    </div>
                  </div>
                </div>
                <div className="about-one__btn-box">
                  <div className="about-one__shape-3 float-bob-x">
                    <img src="/assets/images/shapes/about-one-shape-3.png" alt="" />
                  </div>
                  <Link href={`/${lang}/about`} className="about-one__btn thm-btn">{dict('Discover More')}</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grow-business">
        <div className="container">
          <div className="grow-business__inner">
            <div className="grow-business__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/grow-business-bg.jpg)' }}></div>
            <div className="row">
              <div className="col-xl-6">
                <div className="grow-business__left">
                  <div className="section-title text-left">
                    <div className="section-title__tagline-box">
                      <span className="section-title__tagline">{dict('Human resources')}</span>
                    </div>
                    <h2 className="section-title__title">{dict('Let\'s Grow Business with a New')} <span>{dict('Strategies')}</span></h2>
                  </div>
                  <p className="grow-business__text">{dict('Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu convenient scheduling, account nulla pariatur.')}</p>
                  <ul className="grow-business__points list-unstyled">
                    <li>
                      <div className="icon"><span className="fa fa-check"></span></div>
                      <div className="text"><p>{dict('Lorem ipsum is not simply random text')}</p></div>
                    </li>
                    <li>
                      <div className="icon"><span className="fa fa-check"></span></div>
                      <div className="text"><p>{dict('Making this the first true generator on the Internet')}</p></div>
                    </li>
                    <li>
                      <div className="icon"><span className="fa fa-check"></span></div>
                      <div className="text"><p>{dict('Various versions have evolved over the years')}</p></div>
                    </li>
                  </ul>
                  <div className="grow-business__progress">
                    <h4 className="grow-business__progress-title">{dict('Consulting')}</h4>
                    <div className="bar">
                      <div className="bar-inner count-bar" data-percent="86%">
                        <div className="count-text">86%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-6">
                <div className="grow-business__right">
                  <div className="grow-business__shape-1 float-bob-x">
                    <img src="/assets/images/shapes/grow-business-shape-1.png" alt="" />
                  </div>
                  <ul className="grow-business__right-points list-unstyled">
                    <li>
                      <div className="grow-business__right-points-icon">
                        <span className="icon-experience"></span>
                      </div>
                      <h3 className="grow-business__right-points-title">{dict('Benefits by Investing')} <br /> {dict('your Money')}</h3>
                      <p className="grow-business__right-points-text">{dict('Sed non odio non elit porttit sit tincidunt. Donec fermentum, elit sit amet')}</p>
                    </li>
                    <li>
                      <div className="grow-business__right-points-icon">
                        <span className="icon-consumer-behavior"></span>
                      </div>
                      <h3 className="grow-business__right-points-title">{dict('The most Time-Consuming')} <br /> {dict('Components')}</h3>
                      <p className="grow-business__right-points-text">{dict('Sed non odio non elit porttit sit tincidunt. Donec fermentum, elit sit amet')}</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="video-one">
        <div className="video-one__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/video-one-bg.jpg)' }}></div>
        <div className="container">
          <div className="video-one__inner">
            <div className="video-one__video-link">
              <a href="https://www.youtube.com/watch?v=Get7rqXYrbQ" className="video-popup">
                <div className="video-one__video-icon">
                  <img src="/assets/images/icon/video-one-icon.png" alt="" />
                  <i className="ripple"></i>
                </div>
              </a>
            </div>
            <h3 className="video-one__title">{siteConfig.company.name} {dict('Envision & Transform')} <br /> {dict('Your Business')}</h3>
            <div className="video-one__btn-box">
              <Link href={`/${lang}/about`} className="video-one__btn thm-btn">{dict('Discover More')}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonial-one">
        <div className="testimonial-one__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/testimonial-one-bg.jpg)' }}></div>
        <div className="container">
          <div className="row">
            <div className="col-xl-3 col-lg-4">
              <div className="testimonial-one__left">
                <div className="section-title text-left">
                  <div className="section-title__tagline-box">
                    <span className="section-title__tagline">{dict('our feedbacks')}</span>
                  </div>
                  <h2 className="section-title__title">{dict('Clients are')} <span>{dict('Talking')}</span></h2>
                </div>
                <p className="testimonial-one__left-text">{dict('Lorem Ipsum. Proin gravida nibh vel velit auctor aliquet. Aenean solldin, lorem is simply.')}</p>
                <div className="testimonial-one__rounded-text">
                  <Link href={`/${lang}/testimonials`} className="testimonial-one__curved-circle-box">
                    <div className="curved-circle">
                      <span className="curved-circle--item">{dict('380 satisfied clients')}</span>
                    </div>
                    <div className="testimonial-one__icon">
                      <img src="/assets/images/icon/main-slider-two-rounded-icon.png" alt="" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-xl-9 col-lg-8">
              <div className="testimonial-one__right">
                <div className="testimonial-one__carousel owl-carousel owl-theme thm-owl__carousel" data-owl-options='{"loop": true, "autoplay": true, "margin": 30, "nav": false, "dots": false, "smartSpeed": 500, "autoplayTimeout": 10000, "navText": ["<span class=\"icon-left-arrow\"></span>","<span class=\"icon-right-arrow\"></span>"], "responsive": {"0": {"items": 1}, "768": {"items": 2}, "992": {"items": 2}, "1200": {"items": 3}}}'>
                  <div className="item">
                    <div className="testimonial-one__single">
                      <div className="testimonial-one__content">
                        <div className="testimonial-one__shape-1"></div>
                        <div className="testimonial-one__shape-2"></div>
                        <div className="testimonial-one__img">
                          <img src="/assets/images/testimonial/testimonial-1-1.jpg" alt="" />
                        </div>
                        <div className="testimonial-one__ratting">
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                        </div>
                        <p className="testimonial-one__text">{dict('Lorem ipsum is simply free text dolor not sit amet, notted adipisicing elit sed do eiusmod incididunt labore et dolore text.')}</p>
                      </div>
                      <div className="testimonial-one__client-info">
                        <h3><Link href={`/${lang}/testimonials`}>{dict('Aleesha Brown')}</Link></h3>
                        <p>{dict('Happy Client')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="item">
                    <div className="testimonial-one__single">
                      <div className="testimonial-one__content">
                        <div className="testimonial-one__shape-1"></div>
                        <div className="testimonial-one__shape-2"></div>
                        <div className="testimonial-one__img">
                          <img src="/assets/images/testimonial/testimonial-1-2.jpg" alt="" />
                        </div>
                        <div className="testimonial-one__ratting">
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                        </div>
                        <p className="testimonial-one__text">{dict('Lorem ipsum is simply free text dolor not sit amet, notted adipisicing elit sed do eiusmod incididunt labore et dolore text.')}</p>
                      </div>
                      <div className="testimonial-one__client-info">
                        <h3><Link href={`/${lang}/testimonials`}>{dict('Mike Hardson')}</Link></h3>
                        <p>{dict('Happy Client')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="item">
                    <div className="testimonial-one__single">
                      <div className="testimonial-one__content">
                        <div className="testimonial-one__shape-1"></div>
                        <div className="testimonial-one__shape-2"></div>
                        <div className="testimonial-one__img">
                          <img src="/assets/images/testimonial/testimonial-1-3.jpg" alt="" />
                        </div>
                        <div className="testimonial-one__ratting">
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                          <span className="fa fa-star"></span>
                        </div>
                        <p className="testimonial-one__text">{dict('Lorem ipsum is simply free text dolor not sit amet, notted adipisicing elit sed do eiusmod incididunt labore et dolore text.')}</p>
                      </div>
                      <div className="testimonial-one__client-info">
                        <h3><Link href={`/${lang}/testimonials`}>{dict('Sarah Albert')}</Link></h3>
                        <p>{dict('Happy Client')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="team-one">
        <div className="container">
          <div className="team-one__top">
            <div className="row">
              <div className="col-xl-7 col-lg-6">
                <div className="team-one__left">
                <div className="section-title text-left">
                  <div className="section-title__tagline-box">
                    <span className="section-title__tagline">{dict('meet our team')}</span>
                  </div>
                  <h2 className="section-title__title">{dict('Meet the People Behind')} <br /> {dict('the High')} <span>{dict('Success')}</span></h2>
                </div>
                </div>
              </div>
              <div className="col-xl-5 col-lg-6">
                <div className="team-one__right">
                  <p className="team-one__text">{dict('Lorem ipsum dolor sit amet, consectetur notted adipisicing elit sed do eiusmod tempor incididunt ut labore et simply free text dolore magna aliqua lonm andhn.')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="team-one__bottom">
            <div className="row">
              <div className="col-xl-4 col-lg-4 wow fadeInUp" data-wow-delay="100ms">
                <div className="team-one__single">
                  <div className="team-one__img-box">
                    <div className="team-one__img">
                      <img src="/assets/images/team/team-1-1.jpg" alt="" />
                    </div>
                    <div className="team-one__hover-content">
                      <div className="team-one__hover-arrow-box">
                        <Link href={`/${lang}/team/1`} className="team-one__hover-arrow"><span className="fas fa-share-alt"></span></Link>
                        <ul className="list-unstyled team-one__social">
                          <li><a href="#"><i className="fab fa-twitter"></i></a></li>
                          <li><a href="#"><i className="fab fa-facebook"></i></a></li>
                          <li><a href="#"><i className="fab fa-pinterest-p"></i></a></li>
                          <li><a href="#"><i className="fab fa-instagram"></i></a></li>
                        </ul>
                      </div>
                      <h3 className="team-one__hover-title"><Link href={`/${lang}/team/1`}>{dict('Kevin Martin')}</Link></h3>
                      <p className="team-one__hover-sub-title">{dict('Consultant')}</p>
                      <p className="team-one__hover-text">{dict('There are many vartion of passages of available.')}</p>
                    </div>
                  </div>
                  <div className="team-one__content">
                    <div className="team-one__arrow-box">
                      <Link href={`/${lang}/team/1`} className="team-one__arrow"><span className="fas fa-share-alt"></span></Link>
                    </div>
                    <h3 className="team-one__title"><Link href={`/${lang}/team/1`}>{dict('Kevin Martin')}</Link></h3>
                    <p className="team-one__sub-title">{dict('Consultant')}</p>
                  </div>
                </div>
              </div>
              <div className="col-xl-4 col-lg-4 wow fadeInUp" data-wow-delay="200ms">
                <div className="team-one__single">
                  <div className="team-one__img-box">
                    <div className="team-one__img">
                      <img src="/assets/images/team/team-1-2.jpg" alt="" />
                    </div>
                    <div className="team-one__hover-content">
                      <div className="team-one__hover-arrow-box">
                        <Link href={`/${lang}/team/2`} className="team-one__hover-arrow"><span className="fas fa-share-alt"></span></Link>
                        <ul className="list-unstyled team-one__social">
                          <li><a href="#"><i className="fab fa-twitter"></i></a></li>
                          <li><a href="#"><i className="fab fa-facebook"></i></a></li>
                          <li><a href="#"><i className="fab fa-pinterest-p"></i></a></li>
                          <li><a href="#"><i className="fab fa-instagram"></i></a></li>
                        </ul>
                      </div>
                      <h3 className="team-one__hover-title"><Link href={`/${lang}/team/2`}>{dict('Jessica Brown')}</Link></h3>
                      <p className="team-one__hover-sub-title">{dict('Consultant')}</p>
                      <p className="team-one__hover-text">{dict('There are many vartion of passages of available.')}</p>
                    </div>
                  </div>
                  <div className="team-one__content">
                    <div className="team-one__arrow-box">
                      <Link href={`/${lang}/team/2`} className="team-one__arrow"><span className="fas fa-share-alt"></span></Link>
                    </div>
                    <h3 className="team-one__title"><Link href={`/${lang}/team/2`}>{dict('Jessica Brown')}</Link></h3>
                    <p className="team-one__sub-title">{dict('Consultant')}</p>
                  </div>
                </div>
              </div>
              <div className="col-xl-4 col-lg-4 wow fadeInUp" data-wow-delay="300ms">
                <div className="team-one__single">
                  <div className="team-one__img-box">
                    <div className="team-one__img">
                      <img src="/assets/images/team/team-1-3.jpg" alt="" />
                    </div>
                    <div className="team-one__hover-content">
                      <div className="team-one__hover-arrow-box">
                        <Link href={`/${lang}/team/3`} className="team-one__hover-arrow"><span className="fas fa-share-alt"></span></Link>
                        <ul className="list-unstyled team-one__social">
                          <li><a href="#"><i className="fab fa-twitter"></i></a></li>
                          <li><a href="#"><i className="fab fa-facebook"></i></a></li>
                          <li><a href="#"><i className="fab fa-pinterest-p"></i></a></li>
                          <li><a href="#"><i className="fab fa-instagram"></i></a></li>
                        </ul>
                      </div>
                      <h3 className="team-one__hover-title"><Link href={`/${lang}/team/3`}>{dict('Mike Hardson')}</Link></h3>
                      <p className="team-one__hover-sub-title">{dict('Consultant')}</p>
                      <p className="team-one__hover-text">{dict('There are many vartion of passages of available.')}</p>
                    </div>
                  </div>
                  <div className="team-one__content">
                    <div className="team-one__arrow-box">
                      <Link href={`/${lang}/team/3`} className="team-one__arrow"><span className="fas fa-share-alt"></span></Link>
                    </div>
                    <h3 className="team-one__title"><Link href={`/${lang}/team/3`}>{dict('Mike Hardson')}</Link></h3>
                    <p className="team-one__sub-title">{dict('Consultant')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="counter-one">
        <div className="counter-one__inner">
          <div className="counter-one__shadow"></div>
          <div className="counter-one__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/counter-one-bg.jpg)' }}></div>
          <div className="container">
            <div className="row">
              <div className="col-xl-5 col-lg-5">
                <div className="counter-one__left">
                  <div className="section-title text-left">
                    <div className="section-title__tagline-box">
                      <span className="section-title__tagline">{dict('fun facts')}</span>
                    </div>
                    <h2 className="section-title__title">{dict('Consultancy Funfacts')} <br /> {dict('in Great')} <span>{dict('Numbers')}</span></h2>
                  </div>
                  <p className="counter-one__text">{dict('Leverage agile frameworks to provide a robust synopsis for high level overviews. Iterative approaches to corporate strategy data foster to collaborative thinking.')}</p>
                </div>
              </div>
              <div className="col-xl-7 col-lg-7">
                <div className="counter-one__right">
                  <ul className="counter-one__count-box list-unstyled">
                    <li>
                      <div className="counter-one__icon">
                        <span className="icon-checking"></span>
                      </div>
                      <div className="counter-one__count count-box">
                        <h3 className="count-text" data-stop="886" data-speed="1500">00</h3>
                      </div>
                      <p className="counter-one__text">{dict('Projects Completed')}</p>
                    </li>
                    <li>
                      <div className="counter-one__icon">
                        <span className="icon-recommend"></span>
                      </div>
                      <div className="counter-one__count count-box">
                        <h3 className="count-text" data-stop="600" data-speed="1500">00</h3>
                      </div>
                      <p className="counter-one__text">{dict('Satisfied Customers')}</p>
                    </li>
                    <li>
                      <div className="counter-one__icon">
                        <span className="icon-consulting"></span>
                      </div>
                      <div className="counter-one__count count-box">
                        <h3 className="count-text" data-stop="960" data-speed="1500">00</h3>
                      </div>
                      <p className="counter-one__text">{dict('Expert Consultants')}</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="counter-one__bottom">
          <div className="container">
            <div className="counter-one__bottom-inner">
              <p className="counter-one__bottom-text">{dict('Need best business consultation solutions & services?')} <Link href={`/${lang}/contact`}>{dict('Send a Request')}</Link></p>
              <div className="counter-one__call-box">
                <p>{dict('Call Free')} <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a></p>
                <div className="counter-one__call-icon">
                  <span className="icon-telephone-1"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-one">
        <div className="contact-one__bg" style={{ backgroundImage: 'url(/assets/images/backgrounds/contact-one-bg.jpg)' }}></div>
        <div className="contact-one__shape-1 float-bob-x">
          <img src="/assets/images/shapes/contact-one-shape-1.png" alt="" />
        </div>
        <div className="container">
          <div className="row">
            <div className="col-xl-6 col-lg-6">
              <div className="contact-one__left">
                <form className="contact-one__form contact-form-validated">
                  <div className="row">
                    <div className="col-xl-12">
                      <div className="contact-one__input-box">
                        <input type="text" placeholder={dict('Your name')} name="name" />
                      </div>
                    </div>
                    <div className="col-xl-12">
                      <div className="contact-one__input-box">
                        <input type="email" placeholder={dict('Email address')} name="email" />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-xl-12">
                      <div className="contact-one__input-box text-message-box">
                        <textarea name="message" placeholder={dict('Write message')}></textarea>
                      </div>
                      <div className="contact-one__btn-box">
                        <button type="submit" className="thm-btn contact-one__btn">{dict('Send a Message')}</button>
                      </div>
                    </div>
                  </div>
                </form>
                <div className="result"></div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-6">
              <div className="contact-one__right">
                <div className="section-title text-left">
                  <div className="section-title__tagline-box">
                    <span className="section-title__tagline">{dict('contact us')}</span>
                  </div>
                  <h2 className="section-title__title">{dict('Have Questions? Contact')} <br /> {dict('with us')} <span>{dict('Anytime')}</span></h2>
                </div>
                <ul className="contact-one__points list-unstyled">
                  <li>
                    <div className="icon">
                      <span className="icon-telephone-1"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Have any question?')}</p>
                      <h3>{dict('Free')} <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a></h3>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="icon-email"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Send Email')}</p>
                      <h3><a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a></h3>
                    </div>
                  </li>
                  <li>
                    <div className="icon">
                      <span className="icon-pin"></span>
                    </div>
                    <div className="text">
                      <p>{dict('Visit anytime')}</p>
                      <h3>{siteConfig.contact.address.en}</h3>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
        ====== BRAND ONE SECTION ======
        DO NOT REMOVE - This section is temporarily disabled.
        Future AI: Please do not modify or delete this commented section.
        To enable: Remove the JSX comment wrapper around this section.

      <section className="brand-one">
        <div className="brand-one__title"></div>
        <div className="container">
          <div className="brand-one__carousel thm-owl__carousel owl-theme owl-carousel" data-owl-options='{"items": 3, "margin": 30, "smartSpeed": 700, "loop":true, "autoplay": 6000, "nav":true, "dots":false, "navText": ["<span class=\"fa fa-angle-left\"></span>","<span class=\"fa fa-angle-right\"></span>"], "responsive":{"0":{"items":1}, "768":{"items":3}, "992":{"items": 5}}}'>
            <div className="brand-one__single">
              <div className="brand-one__img">
                <img src="/assets/images/brand/brand-1-1.png" alt="" />
              </div>
            </div>
            <div className="brand-one__single">
              <div className="brand-one__img">
                <img src="/assets/images/brand/brand-1-2.png" alt="" />
              </div>
            </div>
            <div className="brand-one__single">
              <div className="brand-one__img">
                <img src="/assets/images/brand/brand-1-3.png" alt="" />
              </div>
            </div>
            <div className="brand-one__single">
              <div className="brand-one__img">
                <img src="/assets/images/brand/brand-1-4.png" alt="" />
              </div>
            </div>
            <div className="brand-one__single">
              <div className="brand-one__img">
                <img src="/assets/images/brand/brand-1-5.png" alt="" />
              </div>
            </div>
          </div>
        </div>
      </section>

      ====== END BRAND ONE SECTION ======
      */}
    </main>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.seo.defaultDescription,
  }
}
