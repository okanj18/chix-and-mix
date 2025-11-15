import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Card, Button, Textarea } from '../ui/Shared';
import { SparklesIcon, DocumentArrowDownIcon } from '../icons';

export const LogoProposalsPage: React.FC = () => {
    const [keywords, setKeywords] = useState('minimaliste, élégant, couleurs or et noir');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setImages([]);

        try {
            if (!process.env.API_KEY) {
                throw new Error("La clé API n'est pas configurée.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const prompt = `Un logo professionnel pour une boutique de mode de luxe nommée "CHIC & MIX". Le style doit être : ${keywords}. Le logo doit être moderne, élégant, et adapté pour une marque haut de gamme. Pas de texte autre que "CHIC & MIX" ou "C&M". Fond blanc.`;

            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 4,
                    outputMimeType: 'image/png',
                    aspectRatio: '1:1',
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64Images = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
                setImages(base64Images);
            } else {
                throw new Error("L'IA n'a retourné aucune image.");
            }

        } catch (err) {
            console.error("Erreur lors de la génération des logos:", err);
            const errorMessage = (err instanceof Error) ? err.message : "Une erreur inconnue est survenue.";
            setError(`La génération a échoué : ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (base64Image: string, index: number) => {
        const link = document.createElement('a');
        link.href = base64Image;
        link.download = `chic_and_mix_logo_proposal_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="text-center">
                    <h1 className="text-3xl font-serif font-black text-gray-800">Propositions de Logo par IA</h1>
                    <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
                        Laissez l'intelligence artificielle créer des concepts de logo pour votre marque "CHIC & MIX".
                        Décrivez le style que vous recherchez, et découvrez des propositions uniques.
                    </p>
                </div>
            </Card>

            <Card>
                <div className="max-w-xl mx-auto space-y-4">
                    <Textarea
                        label="Décrivez le style du logo"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        rows={3}
                        placeholder="Ex: moderne, abstrait, avec une touche africaine, couleurs vives..."
                    />
                    <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                        <SparklesIcon className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Génération en cours...' : 'Générer 4 propositions'}
                    </Button>
                </div>
            </Card>

            {isLoading && (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">L'IA dessine vos logos, veuillez patienter...</p>
                </div>
            )}

            {error && (
                <Card className="bg-red-50 border-red-200">
                    <p className="text-red-700 font-semibold">Erreur</p>
                    <p className="text-red-600">{error}</p>
                </Card>
            )}

            {images.length > 0 && (
                <Card>
                    <h2 className="text-2xl font-serif font-black text-gray-800 mb-4">Résultats</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {images.map((imgSrc, index) => (
                            <div key={index} className="border rounded-lg overflow-hidden group relative">
                                <img src={imgSrc} alt={`Proposition de logo ${index + 1}`} className="w-full h-auto object-cover aspect-square" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleDownload(imgSrc, index)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    >
                                        <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                                        Télécharger
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};