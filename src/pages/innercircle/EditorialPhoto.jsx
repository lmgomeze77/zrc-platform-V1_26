import { useState } from 'react';

export const editorialPhotos = {
  trade: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Container_terminal_from_above_%28Unsplash%29.jpg',
    alt: 'Vista aérea de filas de contenedores en una terminal de Bukit Merah, Singapur.',
    caption: 'Comercio y capital circulante · Terminal de contenedores en Singapur.',
    author: 'CHUTTERSNAP', license: 'CC0 1.0',
    source: 'https://commons.wikimedia.org/wiki/File:Container_terminal_from_above_(Unsplash).jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    width: 3936, height: 2624,
  },
  energy: {
    src: 'https://images.unsplash.com/photo-1502637098811-fa9526d2b659?auto=format&fit=crop&w=1400&q=80',
    srcSet: 'https://images.unsplash.com/photo-1502637098811-fa9526d2b659?auto=format&fit=crop&w=640&q=80 640w, https://images.unsplash.com/photo-1502637098811-fa9526d2b659?auto=format&fit=crop&w=1000&q=80 1000w, https://images.unsplash.com/photo-1502637098811-fa9526d2b659?auto=format&fit=crop&w=1400&q=80 1400w',
    alt: 'Vista aérea de paneles fotovoltaicos del proyecto Bolero, en la región de Antofagasta, Chile.',
    caption: 'Energía y ejecución · Proyecto fotovoltaico Bolero, Antofagasta, Chile.',
    author: 'Antonio Garcia', license: 'Unsplash License',
    source: 'https://unsplash.com/photos/landscape-photography-of-blue-solar-panels-ndz_u1_tFZo',
    licenseUrl: 'https://unsplash.com/license',
    width: 3000, height: 2000,
  },
};

export default function EditorialPhoto({ subject = 'trade', variant = '' }) {
  const photo = editorialPhotos[subject];
  const [failed, setFailed] = useState(false);
  return <figure className={`ic-editorial-photo ${variant}`}>
    {!failed && <div className="ic-editorial-photo-frame"><img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 800px) 92vw, 1000px" alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" onError={()=>setFailed(true)}/></div>}
    <figcaption><span>{photo.caption}</span><span className="ic-photo-credit"><a href={photo.source} target="_blank" rel="noopener noreferrer">{photo.author}</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></span><span className="ic-photo-context">Fotografía de contexto; no representa una operación de ZRC.</span></figcaption>
  </figure>;
}
