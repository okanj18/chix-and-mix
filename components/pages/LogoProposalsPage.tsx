import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Card } from '../ui/Shared';

// Structure for the logo concepts
const logoConcepts = [
    {
        title: "1. L'Inspiration Wax",
        description: "Un logo qui intègre la richesse visuelle des motifs de tissus wax africains. Le design est moderne tout en étant profondément ancré dans la culture locale, utilisant une palette de couleurs chaudes et énergiques.",
        prompt: "Vibrant and colorful logo for 'CHIC & MIX'. The design is inspired by modern African wax print patterns. Use a warm color palette of orange, teal, and gold. The text is clean and bold. Centered on a plain off-white background. High resolution."
    },
    {
        title: "2. La Palette Teranga",
        description: "Inspiré par l'hospitalité sénégalaise ('Teranga'), ce logo utilise un dégradé de couleurs chaudes rappelant un coucher de soleil sur Dakar : orange, rose et une touche de violet. Il est accueillant et élégant.",
        prompt: "Logo design for 'CHIC & MIX' fashion boutique. Use an abstract, warm color gradient shape. The color palette is inspired by a Senegalese sunset: warm orange, deep pink, and a hint of purple. The text 'CHIC & MIX' is in a clean white font overlaid on the shape. Modern and inviting. High resolution."
    },
    {
        title: "3. Les Blocs de Couleurs",
        description: "Une approche audacieuse et contemporaine. Des formes géométriques simples (carrés, cercles) se superposent dans des couleurs vives et contrastées (rose, bleu électrique, jaune soleil) pour représenter le 'mix' de manière artistique.",
        prompt: "Modern logo for 'CHIC & MIX'. Use overlapping geometric shapes (squares, circles) in a vibrant, contrasting color block style. Colors should be bold pink, electric blue, and sunny yellow. Playful, artistic, and fashionable. High resolution, on a plain off-white background."
    },
    {
        title: "4. Le Splash Aquarelle",
        description: "Un concept artistique où le nom de la marque est apposé sur une éclaboussure d'aquarelle. Le mélange fluide de couleurs comme le turquoise, le magenta et l'ambre symbolise une fusion créative et douce des styles.",
        prompt: "Artistic logo for 'CHIC & MIX'. The text is placed over a vibrant watercolor splash that blends multiple colors like turquoise, magenta, and amber. The effect should be elegant and creative. Centered on a plain off-white background. High resolution."
    },
    {
        title: "5. La Mosaïque Cousue",
        description: "Ce logo traite le symbole '&' comme une mosaïque de morceaux de tissus colorés, comme s'ils avaient été cousus ensemble. Il représente la curation et l'assemblage de pièces uniques pour créer un style.",
        prompt: "Creative logo for fashion boutique 'CHIC & MIX'. The ampersand (&) between the words is designed as a colorful mosaic of stitched fabric patterns. Use a palette of green, coral, and navy blue. Represents a mix of textures and styles. Clean and high-end feel. High resolution."
    }
];


export const LogoProposalsPage: React.FC = () => {
    const [images, setImages] = useState<string[]>(new Array(5).fill(''));
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateLogos = async () => {
            try {
                if (!process.env.API_KEY) {
                    throw new Error("API key is not configured.");
                }
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const imagePromises = logoConcepts.map(concept =>
                    ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: [{ text: concept.prompt }] },
                        config: { responseModalities: [Modality.IMAGE] },
                    })
                );

                const responses = await Promise.all(imagePromises);

                const base64Images = responses.map(response => {
                    const part = response.candidates?.[0]?.content?.parts?.[0];
                    if (part?.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                    return '';
                });

                setImages(base64Images);
            } catch (err) {
                console.error("Error generating logo images:", err);
                setError("Une erreur est survenue lors de la génération des logos. Veuillez vérifier la configuration de votre clé API et réessayer.");
            } finally {
                setIsLoading(false);
            }
        };

        generateLogos();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-serif font-black text-gray-800">Propositions de Logos</h2>
                <p className="text-gray-500 mt-1">Voici 5 concepts visuels pour l'identité de "CHIC AND MIX", générés par IA.</p>
            </div>
            {isLoading && (
                 <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
                    <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-gray-600">Génération des concepts de logo en cours...</p>
                 </div>
            )}
            {error && (
                <Card className="bg-red-50 border border-red-200">
                    <p className="text-red-700">{error}</p>
                </Card>
            )}
            {!isLoading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {logoConcepts.map((concept, index) => (
                        <Card key={index} title={concept.title} className="flex flex-col">
                           <p className="text-sm text-gray-600 mb-4 flex-grow">{concept.description}</p>
                           <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                                {images[index] ? (
                                    <img src={images[index]} alt={concept.title} className="w-full h-full object-contain p-4" />
                                ) : (
                                    <p className="text-xs text-gray-400">Image non disponible</p>
                                )}
                           </div>
                        </Card>
                    ))}
                     <Card title="Et après ?" className="md:col-span-2 lg:col-span-1 bg-primary-50 border border-primary-200">
                        <div className="space-y-4 text-sm text-primary-800">
                            <p>Ces images sont des <strong className="font-semibold">interprétations par l'IA</strong> des concepts de logo.</p>
                            <p>Utilisez-les comme source d'inspiration et de discussion avec un <strong className="font-semibold">designer graphique professionnel</strong>.</p>
                            <p>Un designer pourra affiner ces idées, choisir les bonnes typographies, et créer un logo final vectoriel, adaptable à tous vos supports (enseigne, site web, étiquettes, réseaux sociaux).</p>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};