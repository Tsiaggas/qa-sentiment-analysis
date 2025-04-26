'use client';

import React from 'react';
import ReactSpeedometer from 'react-d3-speedometer';
import { SentimentLabel } from '@/lib/types/sentiment';

interface SentimentVisualizerProps {
  sentimentLabel: SentimentLabel;
  sentimentScore: number;
  scores?: {
    negative: number;
    positive: number;
    neutral: number;
  };
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Συστατικό που οπτικοποιεί το συναίσθημα με ένα μετρητή και προαιρετικά ένα γράφημα μπάρας
 */
export default function SentimentVisualizer({
  sentimentLabel,
  sentimentScore,
  scores = { negative: 0, positive: 0, neutral: 0 },
  showDetails = false,
  size = 'medium',
}: SentimentVisualizerProps) {
  // Καθορισμός των παραμέτρων του μετρητή με βάση το μέγεθος
  const dimensions = {
    small: { width: 200, height: 120 },
    medium: { width: 280, height: 160 },
    large: { width: 350, height: 200 },
  };
  
  const { width, height } = dimensions[size];
  
  // Αντιστοίχιση συναισθήματος σε χρώμα και αριθμητική τιμή για το μετρητή
  const sentimentToValue = {
    'Αρνητικό': 25,
    'Ουδέτερο': 50,
    'Θετικό': 75,
  };
  
  const sentimentToColor = {
    'Αρνητικό': '#EF5350',
    'Ουδέτερο': '#FFAB40',
    'Θετικό': '#66BB6A',
  };
  
  // Μετατροπή του σκορ σε τιμή για το μετρητή (0-100)
  const calculateMeterValue = () => {
    if (sentimentLabel === 'Αρνητικό') {
      // 0-40 για αρνητικό, όπου 0 είναι το χειρότερο
      return 40 * sentimentScore;
    } else if (sentimentLabel === 'Ουδέτερο') {
      // 40-60 για ουδέτερο
      return 40 + (20 * sentimentScore);
    } else {
      // 60-100 για θετικό, όπου 100 είναι το καλύτερο
      return 60 + (40 * sentimentScore);
    }
  };
  
  const meterValue = sentimentToValue[sentimentLabel];
  const color = sentimentToColor[sentimentLabel];
  
  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 text-center">
        <span className="text-lg font-medium" style={{ color }}>
          {sentimentLabel}
        </span>
        {sentimentScore && (
          <span className="ml-2 text-sm text-gray-500">
            ({Math.round(sentimentScore * 100)}%)
          </span>
        )}
      </div>
      
      <ReactSpeedometer
        width={width}
        height={height}
        needleHeightRatio={0.7}
        value={meterValue}
        customSegmentStops={[0, 33, 66, 100]}
        segmentColors={['#EF5350', '#FFAB40', '#66BB6A']}
        currentValueText=""
        needleColor="#464A4F"
        textColor="#000000"
        valueTextFontSize="0px"
        ringWidth={20}
        needleTransitionDuration={3000}
        minValue={0}
        maxValue={100}
      />
      
      {showDetails && scores && (
        <div className="w-full max-w-md mt-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Αναλυτικά Σκορ</h4>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs">
                <span>Αρνητικό</span>
                <span>{Math.round(scores.negative * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-red-500 h-2.5 rounded-full" 
                  style={{ width: `${scores.negative * 100}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span>Ουδέτερο</span>
                <span>{Math.round(scores.neutral * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-orange-400 h-2.5 rounded-full" 
                  style={{ width: `${scores.neutral * 100}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span>Θετικό</span>
                <span>{Math.round(scores.positive * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-500 h-2.5 rounded-full" 
                  style={{ width: `${scores.positive * 100}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 