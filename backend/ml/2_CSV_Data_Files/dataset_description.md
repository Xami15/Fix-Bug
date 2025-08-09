Description
The dataset consists of constant and variable speed data collected from 8 different D396 Marathon Electric 3-phase motors. Each motor has different types of faults artificially created by SpectraQuest. Data is collected using three accelerometers and a microphone (the first, third and fourth columns are accelerometer data, the second column is acoustic data, and the fifth column is temperature data).
The labelling of data is as follows {Letter}-{Letter}-{Number}-{Number}:

The following values represent the possibilities for the first letter:
- H indicates healthy
- R indicates rotor
- S indicates stator
- V indicates voltage
- B indicates bowed
- K indicates broken
- F indicates faulty

The second letter is represented by the following possible values:
- H indicates healthy
- U indicates unbalance
- M indicates misalignment
- W indicates winding
- R indicates rotor
- A indicates rotor bars
- B indicates bearing

The combination of both letters indicates the health state of the motor present in the data sample (e.g. H-H = a healthy motor, S-W = a stator winding fault).

The first number represents:
- 1 is for a constant speed of 15 Hz
- 2 is for a constant speed of 30 Hz
- 3 is for a constant speed of 45 Hz
- 4 is for a constant speed of 60 Hz
- 5 is for an increasing speed from 15 Hz to 45 Hz
- 6 is for an increasing speed from 30 Hz to 60 Hz
- 7 is for a decreasing speed from 45 Hz to 15 Hz
- 8 is for a decreasing speed from 60 Hz to 30 Hz

The second number represents:
- 0 for a no load condition
- 1 for a loaded condition